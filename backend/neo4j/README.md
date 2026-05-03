# HalalIQ Neo4j Seeds

This folder contains optional Cypher seed scripts for expanding the HalalIQ knowledge graph.

## Current Expansion Order

1. Cosmetics & Personal Care
2. Export Compliance
3. Pharmaceuticals

## How To Use

Run `seeds/domain-expansion.cypher` in Neo4j Browser or Neo4j Desktop after the base food graph exists.

The script is designed to be repeatable with `MERGE`, so running it more than once should not create duplicate domain, market, ingredient, or document nodes.

## Domain-Aware Query Support

The `analyze-food` Edge Function now supports optional `Risk` to `Domain` relationships:

```cypher
(risk:Risk)-[:APPLIES_TO_DOMAIN]->(domain:Domain)
```

Legacy risk rows without a domain relationship still work, which keeps the existing food behavior backward-compatible.
