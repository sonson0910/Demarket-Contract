use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey}
use aiken/list
use aiken/transaction.{Transaction, ScriptContext, Spend, Output}
use aiken/transaction/value.{lovelace_of}


type Datum {
  policyId: VerificationKeyHash,
  assetName: VerificationKeyHash,
  seller: VerificationKeyHash,
  // buyer: VerificationKeyHash,
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

    when purpose is {
      Spend(_) ->
        when must_be_signed_by(transaction, datum.seller) is {
          True -> True
          False -> {
            expect Some(_output) = list.find(outputs, fn(output) {check_amount(output, datum.price)})
            expect Some(_royalties) = list.find(outputs, fn(output) {check_amount(output, datum.royalties)})
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
 
fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}
 
