INSERT INTO roles (code, name)
VALUES
    ('SUPER_ADMIN', 'Super Administrator'),
    ('MANAGER', 'Manager'),
    ('AGENT', 'Support Agent'),
    ('CUSTOMER', 'Customer')
ON CONFLICT (code)
DO UPDATE SET
    name = EXCLUDED.name;