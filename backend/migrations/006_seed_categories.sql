INSERT INTO categories (
    name,
    slug,
    description
)
VALUES
    (
        'Technical Issue',
        'technical-issue',
        'Technical problems, errors, bugs, or system access issues.'
    ),
    (
        'Account',
        'account',
        'Account, profile, login, password, and access related requests.'
    ),
    (
        'Billing',
        'billing',
        'Payment, invoice, subscription, and billing related requests.'
    ),
    (
        'Feature Request',
        'feature-request',
        'Requests for new features or improvements.'
    ),
    (
        'General Support',
        'general-support',
        'General questions and support requests.'
    )
ON CONFLICT DO NOTHING;