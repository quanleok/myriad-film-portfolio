# Portfolio copy

This source snapshot preserves the application and database schema. Private operational documents, captured login sessions, audit screenshots, machine-specific agent configuration and one-off production data utilities are excluded.

The two migrations that only created internal demo accounts are retained as empty, documented migration slots. The jobs-surface migration retains its schema changes, normalization, constraints and indexes; its private sample-account and listing inserts are omitted. The featured-drops migration retains the external teaser column and omits its internal curation-account and content inserts. These changes are for a new portfolio development database, not for rewriting an existing deployed database's migration history.

Generic seed tools use reserved example.test addresses and fresh random passwords. They refuse production mode and non-loopback database URLs, and require explicit confirmation. Media tooling additionally requires a separately configured development library. No seed or maintenance command should be pointed at an existing deployment.

The application still needs the services named in .env.example. Use your own development accounts and test payment configuration. Live account state, external video rights and payment-provider onboarding are not included in this source snapshot.
