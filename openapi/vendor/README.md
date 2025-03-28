This folder is meant to contain any 3rd party/vendor OpenAPI definition that we might reference from our own OpenAPI Spec.

We could reference any URL in a `$ref` like this: `$ref: "https://url/to/openapi/spec/yaml/file.yaml#/components/schemas/schemaName"`. But storing them locally solves 2 problems (and creates some more):

- Don't need to download the file from the remote every time.
- Don't need to deal with auth, in case a 3rd party OpenAPI spec isn't public.
- We can fix upstream OpenAPI spec errors that will break our own API spec/linter (ahem, Vonage...).
