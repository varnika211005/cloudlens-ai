from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import requests
from django.conf import settings
from api.models import BillingCache

OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_with_billing_ai(request):
    """
    Chat with AI about your cloud billing (FREE via OpenRouter).
    """
    try:
        user_message = request.data.get('message', '')
        if not user_message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        
        billing_context = []
        caches = BillingCache.objects.filter(user=user, is_fresh=True).order_by('cloud_provider')[:3]
        for cache in caches:
            services = sorted(cache.service_costs.items(), key=lambda item: item[1], reverse=True)
            billing_context.append({
                'provider': cache.get_cloud_provider_display(),
                'total_cost_30days': round(float(cache.total_cost), 2),
                'daily_average': round(float(cache.total_cost) / 30, 2),
                'services': [name for name, _ in services[:5]],
            })

        # Build context
        context_text = "You are CloudLens AI, an expert cloud cost optimization assistant.\n\n"
        
        if billing_context:
            context_text += "User's Cloud Billing Summary:\n"
            for item in billing_context:
                context_text += f"\n{item['provider']}:\n"
                context_text += f"  - Last 30 days: ${item['total_cost_30days']}\n"
                context_text += f"  - Daily average: ${item['daily_average']}\n"
                context_text += f"  - Top services: {', '.join(item['services'])}\n"
        else:
            context_text += "User has not connected any cloud providers yet.\n"

        context_text += f"""
User's question: {user_message}

Keep your response concise (2-3 paragraphs max). Be helpful and focus on cost optimization."""

        # Call OpenRouter API (FREE!)
        if not OPENROUTER_API_KEY:
            top_provider = billing_context[0]['provider'] if billing_context else 'your cloud account'
            return Response({
                'response': (
                    f"I can see billing context for {top_provider}. "
                    "Configure OPENROUTER_API_KEY to enable live AI responses. "
                    "In the meantime, focus on top-cost services and rightsize idle resources."
                ),
                'billing_summary': billing_context,
                'model': 'local-fallback',
                'is_free': True,
            }, status=status.HTTP_200_OK)

        headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
        }
        
        payload = {
            "model": "meta-llama/llama-2-70b-chat",  # Free model
            "messages": [
                {
                    "role": "system",
                    "content": "You are CloudLens AI, an expert cloud cost optimization assistant. Provide concise, actionable advice about cloud costs."
                },
                {
                    "role": "user",
                    "content": context_text
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500,
        }
        
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            return Response(
                {'error': f'API Error: {response.status_code} - {response.text}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        result = response.json()
        
        try:
            ai_response = result['choices'][0]['message']['content']
        except (KeyError, IndexError, TypeError):
            ai_response = "I couldn't generate a response. Please try again."

        return Response({
            'response': ai_response,
            'billing_summary': billing_context,
            'model': 'llama-2-70b',
            'is_free': True
        }, status=status.HTTP_200_OK)

    except requests.exceptions.Timeout:
        return Response(
            {'error': 'Request timeout. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': f'Error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_carbon_footprint(request):
    """
    Calculate carbon footprint based on cloud usage.
    """
    try:
        provider = request.query_params.get('provider', 'AWS').upper()
        days = int(request.query_params.get('days', 30))
        cache = BillingCache.objects.filter(
            user=request.user,
            cloud_provider=provider,
        ).first()
        if not cache:
            return Response(
                {'error': f'Cloud connection not found for {provider}'},
                status=status.HTTP_404_NOT_FOUND
            )

        carbon_factors = {
            'AWS': 450,
            'AZURE': 420,
            'GCP': 380,
        }

        total_cost = float(cache.total_cost)
        estimated_kwh = total_cost * 10
        provider_factor = carbon_factors.get(provider, 450)
        total_co2_kg = (estimated_kwh * provider_factor) / 1000

        sustainability_score = max(0, min(100, 100 - (total_co2_kg / max(days, 1) * 0.5)))

        recommendations = [
            'Switch to renewable-friendly regions where possible',
            'Use spot/preemptible instances for non-critical workloads',
            'Enable auto-scaling to reduce idle capacity',
            'Consolidate underutilized servers',
        ]

        return Response({
            'provider': provider,
            'period_days': days,
            'total_cost': total_cost,
            'estimated_kwh': float(estimated_kwh),
            'total_co2_kg': float(total_co2_kg),
            'co2_per_day': float(total_co2_kg / max(days, 1)),
            'sustainability_score': float(sustainability_score),
            'score_category': 'High Emissions' if sustainability_score < 50 else 'Moderate' if sustainability_score < 75 else 'Green Cloud',
            'recommendations': recommendations,
        })
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
