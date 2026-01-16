export type InputType = 'placeId' | 'url'

export interface CodeSnippets {
  curl: string
  javascript: string
  python: string
}

const getBaseUrl = (streaming: boolean): string => {
  const base = `${import.meta.env.VITE_RITCHY_API_BASE_URL}/api/v1/enrich/company`
  return streaming ? `${base}?stream=true` : base
}

export const generateCodeSnippets = (
  inputType: InputType,
  inputValue: string,
  apiKey: string,
  streaming = false,
): CodeSnippets => {
  const baseUrl = getBaseUrl(streaming)

  const bodyContent =
    inputType === 'placeId'
      ? `{"googlePlaceId": "${inputValue}"}`
      : `{"googleMapsUrl": "${inputValue}"}`

  const bodyContentPretty =
    inputType === 'placeId'
      ? `{ googlePlaceId: '${inputValue}' }`
      : `{ googleMapsUrl: '${inputValue}' }`

  const bodyContentPython =
    inputType === 'placeId'
      ? `{'googlePlaceId': '${inputValue}'}`
      : `{'googleMapsUrl': '${inputValue}'}`

  if (streaming) {
    return {
      curl: `# Streaming endpoint returns Server-Sent Events (SSE)
curl -X POST ${baseUrl} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${bodyContent}'

# Events returned:
# data: {"event":"progress","step":"Extracting website","progress":5}
# data: {"event":"discovery","field":"website","value":"example.com"}
# data: {"event":"complete","data":{...},"meta":{...}}
# data: [DONE]`,

      javascript: `// Streaming with Server-Sent Events (SSE)
const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${bodyContentPretty}),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();

    if (data === '[DONE]') {
      console.log('Stream complete');
      continue;
    }

    const event = JSON.parse(data);
    switch (event.event) {
      case 'progress':
        console.log(\`Progress: \${event.progress}% - \${event.step}\`);
        break;
      case 'discovery':
        console.log(\`Found: \${event.field} = \${JSON.stringify(event.value)}\`);
        break;
      case 'complete':
        console.log('Final data:', event.data);
        break;
      case 'error':
        console.error('Error:', event.message);
        break;
    }
  }
}`,

      python: `# Streaming with Server-Sent Events (SSE)
import requests
import json

response = requests.post(
    '${baseUrl}',
    headers={
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json',
    },
    json=${bodyContentPython},
    stream=True,
)

for line in response.iter_lines():
    if not line:
        continue

    line = line.decode('utf-8')
    if not line.startswith('data: '):
        continue

    data = line[6:].strip()
    if data == '[DONE]':
        print('Stream complete')
        continue

    event = json.loads(data)
    if event['event'] == 'progress':
        print(f"Progress: {event['progress']}% - {event['step']}")
    elif event['event'] == 'discovery':
        print(f"Found: {event['field']} = {event['value']}")
    elif event['event'] == 'complete':
        print('Final data:', event['data'])
    elif event['event'] == 'error':
        print('Error:', event['message'])`,
    }
  }

  // Non-streaming (synchronous) snippets
  return {
    curl: `curl -X POST ${baseUrl} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${bodyContent}'`,

    javascript: `const response = await fetch('${baseUrl}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${bodyContentPretty}),
});

const data = await response.json();`,

    python: `import requests

response = requests.post(
    '${baseUrl}',
    headers={
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json',
    },
    json=${bodyContentPython},
)

data = response.json()`,
  }
}
