// Declare the libraries to use
use aiken/transaction/credential
    .{ Address }
use aiken/list
use aiken/transaction
    .{ Transaction
    ,  Output }
use aiken/transaction/value
    .{ lovelace_of }
use contract/types
    .{ VerificationKeyHash }

// The function checks the amount
pub fn check_amount(output: Output, price: Int) -> Bool {

  // With the amount in the output being greater than the amount passed in from the parameter
  lovelace_of(output.value) >= price
}

// Function to check address
pub fn check_address(output: Output, address: Address) -> Bool {
  
  // Check the two payment addresses from the address in the output and the address passed in from the parameter
  output.address.payment_credential == address.payment_credential
}

// The function checks the signature contained in the transaction
pub fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {

  // Check whether the signature in the input parameter is in the transaction signature list or not
  list.has(transaction.extra_signatories, vk)
}

// The function checks whether the output exists or not
pub fn check_none(output_seller: Option<Output>, output_author: Option<Output>, output_demarket: Option<Output>) -> Bool {
  
  // If one of the 3 outputs does not exist, the function will return False
  if output_seller == None || output_author == None || output_demarket == None{
    False

  }else{

    // Otherwise, the function will return True
    True
  }
}

// Search and return output that satisfies the amount in the output must be greater than the amount in the input parameter and the payment address in the output address must be the same as the payment address in the address from the parameter transmisson in
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
