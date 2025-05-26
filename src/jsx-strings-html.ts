declare global {
  namespace JSX {
    interface IntrinsicElements extends HtmlElements {
      meta: HtmlElements['meta'] & { charset?: 'utf-8', },
    }
  }
}
