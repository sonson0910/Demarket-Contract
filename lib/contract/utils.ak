use aiken/transaction/credential.{Address}
use aiken/list
use aiken/transaction.{Transaction, Output}
use aiken/transaction/value.{lovelace_of}
use contract/types.{VerificationKeyHash}

pub fn check_amount(output: Output, price: Int) -> Bool {
  lovelace_of(output.value) == price
}

pub fn check_address(output: Output, address: Address) -> Bool {
  output.address.payment_credential == address.payment_credential
}

pub fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}


pub fn check_all(output_seller: Option<Output>, output_author: Option<Output>) -> Bool {
  if output_seller == None || output_author == None {
    trace @"Mot trong 2 cai khong ton tai"
    False
  }else{
    True
  }
}