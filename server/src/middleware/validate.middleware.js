// Validate request parts against a Zod schema. Pass a schema shaped like
//   { body?, query?, params? }
// On success the parsed (and coerced) values replace req.body/query/params.
// On failure the ZodError bubbles to the error middleware → 400.
module.exports = (schema) => (req, _res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body);
    if (schema.query) req.query = schema.query.parse(req.query);
    if (schema.params) req.params = schema.params.parse(req.params);
    next();
  } catch (err) {
    next(err);
  }
};
