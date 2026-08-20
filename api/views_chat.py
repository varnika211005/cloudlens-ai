"""
ChatBot API endpoint for CloudLens AI.
Uses OpenRouter API for real AI responses, with mock fallback.
Includes comprehensive debugging for troubleshooting.
"""

import logging
import random
import sys

import requests as http_requests
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from api.models import ChatMessage, BillingCache

logger = logging.getLogger(__name__)


# Contextual mock responses grouped by topic
MOCK_RESPONSES = {
    'aws': [
        "For AWS cost optimization: Enable Cost Explorer to analyse spending patterns and set billing alerts. "
        "Spot Instances can save up to 90% for fault-tolerant workloads, while Savings Plans offer up to 66% "
        "off On-Demand pricing for steady-state compute across EC2, Lambda, and Fargate.",
        "AWS Trusted Advisor highlights idle load balancers, underutilised EC2 instances, and unassociated "
        "Elastic IP addresses. Addressing these findings routinely can cut your bill by 15–25%.",
    ],
    'azure': [
        "Azure Advisor provides personalised recommendations to optimise cost, performance, and reliability. "
        "Azure Reserved VM Instances offer up to 72% savings over Pay-As-You-Go, and Azure Hybrid Benefit "
        "lets you apply existing Windows Server or SQL Server licences to save even more.",
        "Azure Cost Management + Billing gives you granular spending analytics and budget alerts in real time. "
        "Combining resource tagging with budgets by cost centre makes chargeback straightforward.",
    ],
    'gcp': [
        "GCP's Recommender service surfaces ML-driven suggestions including idle VM detection and machine-type "
        "rightsizing. Committed Use Discounts (CUDs) for steady workloads can save up to 57%, and Preemptible "
        "VMs save up to 80% for batch and fault-tolerant jobs.",
        "Cloud Storage lifecycle rules automatically move objects to Nearline, Coldline, or Archive tiers "
        "based on age, cutting storage costs significantly for infrequently accessed data.",
    ],
    'storage': [
        "Implement lifecycle policies to transition data to cheaper tiers automatically. Objects not accessed "
        "in 30 days can move to Infrequent-Access storage; data older than 90 days can move to Archive/Glacier "
        "at a fraction of standard pricing.",
        "Audit unattached block volumes and outdated snapshots regularly — these are silent budget drains. "
        "Deleting or archiving stale snapshots typically reclaims 10–20% of storage spend.",
    ],
    'cost': [
        "The quickest wins in cloud cost reduction are: (1) delete truly idle resources, (2) rightsize "
        "over-provisioned instances, and (3) switch predictable workloads to reserved/committed pricing. "
        "Together these routinely deliver 20–40% savings.",
        "Reserved Instances and Committed Use Discounts reward upfront commitment with 30–60% discounts. "
        "Analyse at least 90 days of usage data before committing to ensure the commitment matches demand.",
        "Right-sizing is the highest-ROI optimisation for most teams. If average CPU utilisation is below 40% "
        "over 14 days, drop to the next smaller instance type — you can always scale back up.",
    ],
    'default': [
        "CloudLens AI monitors your multi-cloud spend and surfaces actionable optimisations. Connect your "
        "cloud accounts to receive personalised recommendations based on your real usage patterns.",
        "The most common sources of cloud waste are oversized instances (~30%), idle resources (~25%), "
        "unattached storage volumes (~20%), and unused reserved capacity (~15%). Tackling these areas "
        "typically yields 20–40% cost savings.",
        "Autoscaling is one of the most effective ways to match capacity to demand. Well-tuned autoscaling "
        "can reduce costs by 40–60% for variable workloads while maintaining performance SLAs.",
        "Tagging all resources by project, environment, and team gives you the visibility needed for "
        "effective cost management. Without tags, it is very difficult to allocate costs or identify waste.",
        "A monthly FinOps review — comparing actual spend to budget, reviewing Advisor/Trusted Advisor "
        "findings, and acting on top recommendations — keeps cloud costs under control over time.",
    ],
}


def _get_mock_response(user_message: str, billing_context: list) -> str:
    """Return a contextual mock response based on message keywords and billing data."""
    msg = user_message.lower()

    if any(w in msg for w in ['aws', 'amazon', 'ec2', 's3', 'lambda']):
        pool = MOCK_RESPONSES['aws']
    elif any(w in msg for w in ['azure', 'microsoft']):
        pool = MOCK_RESPONSES['azure']
    elif any(w in msg for w in ['gcp', 'google', 'gke', 'bigquery']):
        pool = MOCK_RESPONSES['gcp']
    elif any(w in msg for w in ['storage', 'bucket', 'blob', 'archive', 'glacier']):
        pool = MOCK_RESPONSES['storage']
    elif any(w in msg for w in ['cost', 'bill', 'save', 'cheap', 'expensive', 'reduc', 'optim']):
        pool = MOCK_RESPONSES['cost']
    else:
        pool = MOCK_RESPONSES['default']

    response = random.choice(pool)

    # Append a brief billing-context summary when data is available
    if billing_context:
        providers = [ctx['provider'] for ctx in billing_context]
        total = sum(ctx['total_cost_30days'] for ctx in billing_context)
        top_services = []
        for ctx in billing_context:
            if ctx.get('services'):
                top_services.append(f"{ctx['provider']}: {', '.join(ctx['services'][:3])}")
        response += (
            f"\n\nYour connected accounts ({', '.join(providers)}) spent **${total:.2f}** "
            f"in the last 30 days."
        )
        if top_services:
            response += f" Top services — {'; '.join(top_services)}."

    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_with_ai(request):
    """
    Handle a chat message and return an AI (or mock) response.

    Request body:
        { "message": "<user text>" }

    Response:
        {
          "response": "<assistant text>",
          "billing_summary": [...],
          "model": "<model name>",
          "is_mock": true|false
        }
    """
    user_message = request.data.get('message', '').strip()
    if not user_message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user

    # Persist the user's message
    ChatMessage.objects.create(user=user, role='user', content=user_message)

    # Gather billing context for the current user
    billing_context = []
    for cache in BillingCache.objects.filter(user=user, is_fresh=True).order_by('cloud_provider')[:3]:
        services = sorted(cache.service_costs.items(), key=lambda kv: kv[1], reverse=True)
        billing_context.append({
            'provider': cache.get_cloud_provider_display(),
            'total_cost_30days': round(float(cache.total_cost), 2),
            'daily_average': round(float(cache.total_cost) / 30, 2),
            'services': [name for name, _ in services[:5]],
        })

    # Try live AI via OpenRouter if a key is configured
    openrouter_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    
    # DEBUG: Log key availability
    print("=" * 80)
    print("[DEBUG] Chat API Called")
    print(f"[DEBUG] User: {user.email}")
    print(f"[DEBUG] Message: {user_message}")
    print(f"[DEBUG] OpenRouter Key Available: {bool(openrouter_key)}")
    if openrouter_key:
        print(f"[DEBUG] OpenRouter Key (first 20 chars): {openrouter_key[:20]}...")
    print("=" * 80)
    
    if openrouter_key:
        try:
            print("[DEBUG] Attempting to call OpenRouter API...")
            
            context_text = "You are CloudLens AI, an expert cloud cost optimisation assistant.\n\n"
            if billing_context:
                context_text += "User's Cloud Billing Summary:\n"
                for item in billing_context:
                    context_text += (
                        f"\n{item['provider']}:\n"
                        f"  - Last 30 days: ${item['total_cost_30days']}\n"
                        f"  - Daily average: ${item['daily_average']}\n"
                        f"  - Top services: {', '.join(item['services'])}\n"
                    )
            else:
                context_text += "User has not connected any cloud providers yet.\n"
            context_text += f"\nUser question: {user_message}\n\nRespond concisely (2–3 paragraphs max)."

            print(f"[DEBUG] Context prepared. Length: {len(context_text)} chars")
            
            # Build request payload
            payload = {
                "model": "openai/gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are CloudLens AI, an expert cloud cost optimisation assistant.",
                    },
                    {"role": "user", "content": context_text},
                ],
                "temperature": 0.7,
                "max_tokens": 500,
            }
            
            print("[DEBUG] Sending payload to OpenRouter...")
            print(f"[DEBUG] Payload model: {payload['model']}")
            print(f"[DEBUG] Number of messages: {len(payload['messages'])}")

            ai_resp = http_requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {openrouter_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3000',
                },
                json=payload,
                timeout=30,
            )

            print(f"[DEBUG] OpenRouter Response Status: {ai_resp.status_code}")
            print(f"[DEBUG] OpenRouter Response Headers: {dict(ai_resp.headers)}")
            print(f"[DEBUG] OpenRouter Response Body: {ai_resp.text[:500]}...")

            if ai_resp.status_code == 200:
                print("[DEBUG] ✅ SUCCESS! Response status is 200")
                ai_json = ai_resp.json()
                print(f"[DEBUG] Response JSON keys: {list(ai_json.keys())}")
                
                if 'choices' in ai_json and len(ai_json['choices']) > 0:
                    ai_text = ai_json['choices'][0]['message']['content']
                    print(f"[DEBUG] ✅ Extracted AI response: {ai_text[:100]}...")
                    
                    ChatMessage.objects.create(user=user, role='assistant', content=ai_text)
                    
                    print("[DEBUG] ✅ OpenRouter AI response saved to database")
                    print("=" * 80)
                    
                    return Response({
                        'response': ai_text,
                        'billing_summary': billing_context,
                        'model': 'openrouter-ai',
                        'is_mock': False,
                    }, status=status.HTTP_200_OK)
                else:
                    print(f"[DEBUG] ❌ No choices in response: {ai_json}")
                    raise ValueError("No choices in OpenRouter response")
            else:
                print(f"[DEBUG] ❌ OpenRouter returned status {ai_resp.status_code}")
                print(f"[DEBUG] Response: {ai_resp.text}")
                raise http_requests.RequestException(f"Status {ai_resp.status_code}: {ai_resp.text}")
                
        except http_requests.exceptions.Timeout as exc:
            print(f"[DEBUG] ❌ TIMEOUT ERROR: {exc}")
            logger.warning(f"OpenRouter timeout: {exc}")
        except http_requests.exceptions.ConnectionError as exc:
            print(f"[DEBUG] ❌ CONNECTION ERROR: {exc}")
            logger.warning(f"OpenRouter connection error: {exc}")
        except http_requests.RequestException as exc:
            print(f"[DEBUG] ❌ REQUEST ERROR: {exc}")
            logger.warning(f"OpenRouter request error: {exc}")
        except (KeyError, ValueError) as exc:
            print(f"[DEBUG] ❌ PARSING ERROR: {exc}")
            logger.warning(f"OpenRouter parsing error: {exc}")
        except Exception as exc:
            print(f"[DEBUG] ❌ UNEXPECTED ERROR: {type(exc).__name__}: {exc}")
            logger.exception("OpenRouter unexpected error")

    # Fallback: contextual mock response
    print("[DEBUG] ⚠️  Using MOCK response (OpenRouter failed or unavailable)")
    mock_text = _get_mock_response(user_message, billing_context)
    ChatMessage.objects.create(user=user, role='assistant', content=mock_text)
    
    print(f"[DEBUG] Mock response: {mock_text[:100]}...")
    print("=" * 80)

    return Response({
        'response': mock_text,
        'billing_summary': billing_context,
        'model': 'cloudlens-mock',
        'is_mock': True,
    }, status=status.HTTP_200_OK)
