use aiken/transaction/credential.{from_verification_key}
use aiken/list
use aiken/transaction.{Transaction, ScriptContext, Spend}
use aiken/transaction/value.{PolicyId, AssetName, lovelace_of}
use contract/utils.{check_amount, check_address, must_be_signed_by, check_all}
use contract/types.{VerificationKeyHash}

type Datum {
  policyId: PolicyId,
  assetName: AssetName,
  seller: VerificationKeyHash,
  author: VerificationKeyHash,
  price: Int,
  royalties: Int, 
}
    
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
            let output_seller = list.find(outputs, 
              fn(output) {
                lovelace_of(output.value)>= datum.price &&
                check_address(output, from_verification_key(datum.seller))
              }
            )

            let output_author = list.find(outputs, 
              fn(output) {
                check_amount(output, datum.royalties) &&
                check_address(output, from_verification_key(datum.author))
              }
            )
            check_all(output_seller, output_author)
          }
        }
      _ -> False
    }
  }
}

// fn check_amount(output: Output, price: Int) -> Bool {
//   lovelace_of(output.value) == price
// }

// fn check_address(output: Output, address: Address) -> Bool {
//   output.address.payment_credential == address.payment_credential
// }

// fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
//   list.has(transaction.extra_signatories, vk)
// }


// fn check_all(output_seller: Option<Output>, output_author: Option<Output>) -> Bool {
//   if output_seller == None || output_author == None {
//     trace @"Mot trong 2 cai khong ton tai"
//     False
//   }else{
//     True
//   }
// }