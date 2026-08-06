/**
 * Shared email styling.
 *
 * Email clients strip <style> blocks and ignore most modern CSS, so everything
 * here is plain inline style objects. Colours mirror the site palette in
 * app/globals.css, hardcoded because CSS custom properties do not survive the
 * trip into an inbox.
 */

export const SITE_URL = 'https://stopandgrowkc.org'
/**
 * Must be an address Cloudflare Email Routing actually forwards, or replies and
 * footer links bounce. Currently only orders@ is routed.
 */
export const CONTACT_EMAIL = 'orders@stopandgrowkc.org'

const INK = '#1f2417'
const MUTED = '#5c6452'
const PRIMARY = '#4a7c2f'
const BORDER = '#e2e5dc'
const PAPER = '#faf9f5'

export const styles = {
  body: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    margin: 0,
    padding: '24px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    border: `1px solid ${BORDER}`,
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '560px',
    padding: '32px',
  },
  heading: {
    color: INK,
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 16px',
  },
  text: {
    color: INK,
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px',
  },
  muted: {
    color: MUTED,
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0 0 8px',
  },
  button: {
    backgroundColor: PRIMARY,
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 24px',
    textDecoration: 'none',
  },
  hr: {
    border: 'none',
    borderTop: `1px solid ${BORDER}`,
    margin: '24px 0',
  },
  link: {
    color: PRIMARY,
    wordBreak: 'break-all' as const,
  },
} as const
