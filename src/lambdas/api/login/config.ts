export interface LoginConfig {
  privateKey: string
  jwt: {
    algorithm: string
    issuer: string
    expiresIn: string
  }
  googleClientId: string
}