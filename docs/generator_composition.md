# Generator Composition

Generators can declare capabilities they provide and capabilities they require.

The composition engine detects missing capabilities, duplicate providers, incompatible generators, and ordering requirements. Existing MVP generation remains stable while future generators can compose by capability instead of hardcoded ordering.
