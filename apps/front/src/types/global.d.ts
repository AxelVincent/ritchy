declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: temporary for sleekplan script
    $sleek?: any[]
    SLEEK_PRODUCT_ID?: number
  }
}

export {}
