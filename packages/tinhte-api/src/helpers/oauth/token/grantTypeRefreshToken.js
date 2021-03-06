import FormData from 'form-data'

const grantTypeRefreshToken = (api, internalApi, clientSecret, refreshToken) => {
  const formData = new FormData()
  formData.append('grant_type', 'refresh_token')
  formData.append('client_id', api.getClientId())
  formData.append('client_secret', clientSecret)
  formData.append('refresh_token', refreshToken)

  const options = {
    body: formData,
    method: 'POST',
    uri: 'oauth/token'
  }

  return api.fetchOne(options)
    .then((json) => {
      /* istanbul ignore else */
      if (json.user_id) {
        internalApi.log('oauth/token?grant_type=refresh_token: %s -> %d', refreshToken, json.user_id)
      }

      return json
    })
}

export default grantTypeRefreshToken
