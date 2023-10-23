use aiken/transaction/credential.{Address, Inline, VerificationKeyCredential}
use contract/types.{VerificationKeyHash}

pub const demarket_stake_vkh: VerificationKeyHash =
  #"3061bacb0f06860c0b51cc3a5faf8965e476853462e0bc6768acba88"

pub const demarket_vkh: VerificationKeyHash =
  #"90c5b1c19f0a27145f500e62f088a27e88d3165331709e4ea53637b9"

pub fn demarket_addr() -> Address {
  Address {
    payment_credential: VerificationKeyCredential(demarket_vkh),
    stake_credential: Some(
      Inline(VerificationKeyCredential(demarket_stake_vkh)),
    ),
  }
}

pub const demarket_pct: Int = 20

pub const min_payout: Int = 1000000