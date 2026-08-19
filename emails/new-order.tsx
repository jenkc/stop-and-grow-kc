import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'
import { SITE_URL, styles } from './theme'

export type NewOrderEmailProps = {
    orderNumber: string
    contactName: string
    contactEmail?: string | null
    contactPhone?: string | null
    fulfillment: 'pickup' | 'delivery'
    windowLabel?: string | null
    /** Pre-formatted, e.g. "$25.00" — the caller owns money formatting. */
    total: string
    items: { description: string; quantity: number; lineTotal: string }[]
    dietaryNotes?: string | null
    address?: string | null
}

/**
 * Sent to Scraps when a customer places an order on the site.
 *
 * Operational, not decorative: she reads this on a phone, often while doing
 * something else, and the only questions that matter are what was ordered, when
 * it needs to be there, and whether anything about it is unusual. The dietary
 * note is called out rather than buried, because it is the thing that changes
 * what goes in the box.
 *
 * The Preview line carries the name and total, so the notification banner alone
 * answers "is this worth opening right now".
 */
export function NewOrderEmail({
    orderNumber,
    contactName,
    contactEmail,
    contactPhone,
    fulfillment,
    windowLabel,
    total,
    items,
    dietaryNotes,
    address,
}: NewOrderEmailProps) {
    const isDelivery = fulfillment === 'delivery'

    return (
        <Html>
            <Head />
            <Preview>{`${contactName} — ${total} ${isDelivery ? 'delivery' : 'pickup'}`}</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    <Text style={styles.heading}>New order {orderNumber}</Text>

                    <Section>
                        <Text style={styles.muted}>
                            {isDelivery ? 'Delivery' : 'Pickup'}
                            {windowLabel ? ` · ${windowLabel}` : ''}
                        </Text>

                        <Text style={styles.text}>
                            <strong>{contactName}</strong>
                            {contactPhone && (
                                <>
                                    <br />
                                    {/* tel: so she can call from the notification without
                                        copying the number out. */}
                                    <Link href={`tel:${contactPhone}`} style={styles.link}>
                                        {contactPhone}
                                    </Link>
                                </>
                            )}
                            {contactEmail && (
                                <>
                                    <br />
                                    <Link href={`mailto:${contactEmail}`} style={styles.link}>
                                        {contactEmail}
                                    </Link>
                                </>
                            )}
                        </Text>

                        {isDelivery && address && (
                            <>
                                <Text style={styles.muted}>Deliver to</Text>
                                <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>
                                    {address}
                                </Text>
                            </>
                        )}
                    </Section>

                    <Hr style={styles.hr} />

                    <Section>
                        {items.map((item, i) => (
                            <Text key={i} style={styles.text}>
                                {item.quantity} × {item.description} — {item.lineTotal}
                            </Text>
                        ))}
                        <Text style={{ ...styles.text, fontWeight: 'bold' }}>
                            Total {total}
                        </Text>
                    </Section>

                    {dietaryNotes && (
                        <>
                            <Hr style={styles.hr} />
                            {/* Given its own block rather than a line in a list: this is
                                the one field that changes what physically goes in the
                                box, and it is easy to miss in a scan. */}
                            <Text style={styles.muted}>Do not include</Text>
                            <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>
                                {dietaryNotes}
                            </Text>
                        </>
                    )}

                    <Hr style={styles.hr} />

                    <Text style={styles.muted}>
                        <Link href={`${SITE_URL}/Admin`} style={styles.link}>
                            Open the admin screen
                        </Link>{' '}
                        to mark it packed or paid.
                    </Text>
                    <Text style={styles.muted}>
                        The order is saved whether or not this email arrived.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

export default NewOrderEmail
