-- Built-in login: store a PBKDF2-SHA256 password hash per account member.
-- Format: pbkdf2$<iterations>$<saltHex>$<hashHex>
ALTER TABLE account_members ADD COLUMN password_hash TEXT;
