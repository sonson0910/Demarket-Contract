use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{Address, VerificationKey, from_verification_key}
use aiken/list
use aiken/transaction.{Transaction, ScriptContext, Spend, Output}
use aiken/transaction/value.{lovelace_of}


type Datum {
  policyId: VerificationKeyHash,
  assetName: VerificationKeyHash,
  seller: VerificationKeyHash,
  // buyer: VerificationKeyHash,
  author: VerificationKeyHash,
  price: Int,
  royalties: Int, 
  // address: Address,
}

type VerificationKeyHash = 
    Hash<Blake2b_224, VerificationKey>
    
validator {
  fn contract(datum: Datum, _redeemer: Void, ctx: ScriptContext) {

    let ScriptContext {transaction, purpose} = ctx

    let Transaction {outputs, ..} = transaction

    let seller_sign = must_be_signed_by(transaction, datum.seller)

    when purpose is {
      Spend(_) ->
        when seller_sign is {
          True -> True
          False -> {
            expect Some(_output_seller) = list.find(outputs, 
              fn(output) {
                check_amount(output, datum.price) &&
                check_address(output, from_verification_key(datum.seller))
              }
            )
            expect Some(_output_author) = list.find(outputs, 
              fn(output) {
                check_amount(output, datum.royalties) &&
                check_address(output, from_verification_key(datum.author))
              }
            )
            // must_be_signed_by(transaction, datum.buyer)
            True
          }
        }
      _ -> False
    }
  }
}

fn check_amount(output: Output, price: Int) -> Bool {
  lovelace_of(output.value) == price
}

fn check_address(output: Output, address: Address) -> Bool {
  output.address.payment_credential == address.payment_credential
}

fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}