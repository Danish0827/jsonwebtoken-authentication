import jwt from "jsonwebtoken";

function authenticateToken(req, res, next) {
  const token = req.cookies.access_token;
  
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: err });
    }

    req.user = user;
    next();
  });
}

export default authenticateToken;


