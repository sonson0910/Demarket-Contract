// Declare the libraries to use
use aiken/transaction/credential
    .{ Address
    ,  Inline
    ,  VerificationKeyCredential }
use contract/types
    .{ VerificationKeyHash }

// Payment address of the exchange
pub const demarket_payment_vkh: VerificationKeyHash =
  #"3a4e6757f24d9dddb65c8aef60d0999957b3650453e5e7721fb4fd42"

// Staking address of the exchange
pub const demarket_stake_vkh: VerificationKeyHash =
  #"32798960f1b4dc35be90add0d31aed0e3019ea0e47288296a5737e60"

// Combine the above 2 addresses into the trading exchange address
pub fn demarket_addr() -> Address {
  Address {
    payment_credential: VerificationKeyCredential(demarket_payment_vkh),
    stake_credential: Some(
      Inline(VerificationKeyCredential(demarket_stake_vkh)),
    ),
  }
}

// Transaction fee percentage
pub const demarket_pct: Int = 1