export type InputType = 'placeId' | 'url'

export interface CodeSnippets {
  curl: string
  javascript: string
  python: string
}

const BASE_URL = `${import.meta.env.VITE_RITCHY_API_BASE_URL}/api/v1/enrich/company`

export const generateCodeSnippets = (
  inputType: InputType,
  inputValue: string,
  apiKey: string,
): CodeSnippets => {
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

  return {
    curl: `curl -X POST ${BASE_URL} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${bodyContent}'`,

    javascript: `const response = await fetch('${BASE_URL}', {
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
    '${BASE_URL}',
    headers={
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json',
    },
    json=${bodyContentPython},
)

data = response.json()`,
  }
}
