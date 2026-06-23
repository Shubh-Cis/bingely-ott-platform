// Uniform success envelope so every endpoint returns the same shape:
//   { success: true, data, message, meta? }
function ok(res, data = null, message = "OK", meta = undefined) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(200).json(body);
}

function created(res, data = null, message = "Created") {
  return res.status(201).json({ success: true, message, data });
}

function paginated(res, items, { page, pageSize, total }, message = "OK") {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

module.exports = { ok, created, paginated };
