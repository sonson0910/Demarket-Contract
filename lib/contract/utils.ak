use aiken/transaction/credential.{Address}
use aiken/list
use aiken/transaction.{Transaction, Output}
use aiken/transaction/value.{lovelace_of}
use contract/types.{VerificationKeyHash}

pub fn check_amount(output: Output, price: Int) -> Bool {
  lovelace_of(output.value) >= price
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

pub fn find_output(outputs: List<Output>, price: Int, address: Address) -> Option<Output>{
  list.find(outputs, 
    fn(output) {
      check_amount(output, price) &&
      check_address(output, address)
    }
  )
}

pub fn check_price_duplicate(out_sell: Output, out_royal: Output) -> Bool {
  lovelace_of(out_sell.value) > lovelace_of(out_royal.value)
}

pub fn check_address_duplicate(out_sell: Output, out_royal: Output) -> Bool {
  out_sell.address.payment_credential == out_royal.address.payment_credential
}