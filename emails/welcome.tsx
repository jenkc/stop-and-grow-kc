import {
    Body,
    Button,
    Container,
    Head,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'
import { styles, SITE_URL, CONTACT_EMAIL } from './theme'

export type WelcomeEmailProps = {
    /** First name if we have one — the signup form collects it. */
    name?: string
}

/**
 * Sent once, after the user clicks their confirmation link and the account is
 * live. This is the only marketing-adjacent mail in the auth flow; the
 * confirmation email itself stays plain on purpose (spam filters treat
 * promotional content in auth mail poorly).
 */
export function WelcomeEmail({ name }: WelcomeEmailProps) {
    const greeting = name ? `Welcome, ${name}.` : 'Welcome.'

    return (
        <Html>
            <Head />
            <Preview>Your Stop and Grow account is ready — here&rsquo;s how ordering works.</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    <Text style={styles.heading}>{greeting}</Text>

                    <Text style={styles.text}>
                        Your account is confirmed and ready to use. Stop and Grow KC
                        distributes fresh produce boxes around Kansas City — you pick a box
                        size, we fill it with what&rsquo;s good that week.
                    </Text>

                    <Section>
                        <Text style={styles.heading}>How ordering works</Text>
                        <Text style={styles.text}>
                            <strong>1. Pick a box.</strong> Boxes run from $5 to $30. Bigger
                            box, more produce.
                            <br />
                            <strong>2. Choose pickup or delivery.</strong> Delivery needs an
                            address and a time window that suits you.
                            <br />
                            <strong>3. We confirm.</strong> You&rsquo;ll hear from us with
                            the details before anything arrives.
                        </Text>
                    </Section>

                    <Section style={{ margin: '24px 0' }}>
                        <Button href={`${SITE_URL}/Order`} style={styles.button}>
                            Place an order
                        </Button>
                    </Section>

                    <Hr style={styles.hr} />

                    <Text style={styles.muted}>
                        Questions, or something not working? Reply to this email or write to{' '}
                        <Link href={`mailto:${CONTACT_EMAIL}`} style={styles.link}>
                            {CONTACT_EMAIL}
                        </Link>
                        — a real person reads it.
                    </Text>
                    <Text style={styles.muted}>Stop and Grow KC · Kansas City</Text>
                </Container>
            </Body>
        </Html>
    )
}

export default WelcomeEmail
