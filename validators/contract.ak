use aiken/transaction/credential
    .{ from_verification_key }
use aiken/transaction
    .{ Transaction
    ,  ScriptContext
    ,  Spend }
use aiken/transaction/value
    .{ PolicyId
    ,  AssetName }
use contract/utils
    .{ must_be_signed_by
    ,  check_none
    ,  find_output
    ,  check_price_duplicate
    ,  check_address_duplicate }
use contract/types
    .{ VerificationKeyHash }
use contract/constants
    .{ demarket_addr
    ,  demarket_pct }

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
            let demarket_fee: Int = demarket_pct * datum.price / 100

            let output_seller = find_output(outputs, datum.price, from_verification_key(datum.seller))

            let output_author = find_output(outputs, datum.royalties, from_verification_key(datum.author))

            let output_demarket = find_output(outputs, demarket_fee, demarket_addr())

            let check_none_output = check_none(output_seller, output_author, output_demarket)
            

            when check_none_output is{

              True -> {

                expect Some(out_sell) = find_output(outputs, datum.price, from_verification_key(datum.seller))

                expect Some(out_royal) = find_output(outputs, datum.royalties, from_verification_key(datum.author))

                if check_address_duplicate(out_sell, out_royal) {

                  check_price_duplicate(out_sell, out_royal)
                } else {

                  True
                }
              }

              False -> False
            }
          }
        }
        
      _ -> False
    }
  }
}
