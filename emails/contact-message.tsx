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
import { styles } from './theme'

export type ContactMessageEmailProps = {
    name: string
    email: string
    /** Optional — the form does not require a subject. */
    subject?: string
    body: string
}

/**
 * The /Contact form notification. This one goes to us, not to a customer, so it
 * is deliberately plain: no button, no marketing copy, nothing that gets in the
 * way of reading the message and hitting Reply.
 *
 * sendContactEmail() sets replyTo to the sender's address, so Reply reaches the
 * visitor rather than the no-reply mailbox this was sent from. The address is
 * still printed below — a forwarded copy loses the header.
 */
export function ContactMessageEmail({
    name,
    email,
    subject,
    body,
}: ContactMessageEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>{`${name}: ${subject || 'New message from the contact form'}`}</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    <Text style={styles.heading}>New contact form message</Text>

                    <Section>
                        <Text style={styles.muted}>From</Text>
                        <Text style={styles.text}>
                            {name}
                            <br />
                            <Link href={`mailto:${email}`} style={styles.link}>
                                {email}
                            </Link>
                        </Text>

                        {subject && (
                            <>
                                <Text style={styles.muted}>Subject</Text>
                                <Text style={styles.text}>{subject}</Text>
                            </>
                        )}
                    </Section>

                    <Hr style={styles.hr} />

                    {/* whiteSpace: pre-wrap so the visitor's line breaks survive —
                        without it a paragraphed message collapses into one block. */}
                    <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>{body}</Text>

                    <Hr style={styles.hr} />

                    <Text style={styles.muted}>
                        Reply to this email to answer {name} directly.
                    </Text>
                    <Text style={styles.muted}>
                        A copy is saved in the database whether or not this email arrived.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

export default ContactMessageEmail
