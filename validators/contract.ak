// Declare the libraries needed in the contract
// There are a number of libraries we have written ourselves and imported into the contract file
use aiken/transaction/credential
    .{ from_verification_key }
use aiken/list
    .{ filter
    ,  length }
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
    ,  check_address
    ,  check_amount }
use contract/types
    .{ VerificationKeyHash }
use contract/constants
    .{ demarket_addr
    ,  demarket_pct }

// Some data is needed to operate the contract
type Datum {
  policyId: PolicyId, 
  assetName: AssetName,
  seller: VerificationKeyHash,
  author: VerificationKeyHash,
  price: Int,
  royalties: Int, 
}

// The validator has no parameters
validator {
  // This contract function receives data and information from the transaction (ScriptContext)
  fn contract(datum: Datum, _redeemer: Void, ctx: ScriptContext) {

    // Get transaction and purpose from ctx
    let ScriptContext {transaction, purpose} = ctx

    // Retrieve the outputs contained in the transaction
    let Transaction {outputs, ..} = transaction

    // Check to see if the signature in the newly created transaction matches the signature the seller posted to the previous contract
    let seller_sign = must_be_signed_by(transaction, datum.seller)

    // Check the purpose of the transaction
    when purpose is {

      // If it is a consumption transaction, the contract will continue to be performed
      Spend(_) ->

        // Check the signature of the transaction creator
        when seller_sign is {

          // If that signature matches the seller's signature, the contract will return True, which means taking the property back.
          True -> True

          // If not signed by the seller, the contract will check the constraints so the buyer can get that asset back to their wallet
          False -> {

            // Trading platform fees
            let demarket_fee: Int = demarket_pct * datum.price / 100
            
            // Search for output included in the transaction that satisfies the amount of money sent to the seller and must be sent to the correct address
            let output_seller = find_output(outputs, datum.price, from_verification_key(datum.seller))

            // Search for output included in the transaction that satisfies the amount of money sent to the author and must be sent to the correct address
            let output_author = find_output(outputs, datum.royalties, from_verification_key(datum.author))

            // Search for the output contained in the transaction that satisfies the amount of money sent to the exchange and must be sent to the correct address
            let output_demarket = find_output(outputs, demarket_fee, demarket_addr())

            // Check if all 3 outputs above exist, and save it to a variable
            let check_none_output = check_none(output_seller, output_author, output_demarket)
            
            // Continue analyzing the results of the check_none_output variable
            when check_none_output is{

              // If all 3 outputs exist, continue checking some constraints
              True -> {

                // Check if the author is the seller
                if datum.seller == datum.author {

                  // Find outputs that satisfy the seller's address and the amount must be greater than the royalty amount
                  let list_out = filter(outputs, 
                    
                    // The output is taken from the outputs contained in the transaction
                    fn(output) { 
                      check_address(output, from_verification_key(datum.seller)) && 
                      check_amount(output, datum.royalties) 
                    }
                  )
                  
                  // If more than 2 outputs exist, check again
                  if length(list_out) >= 2 {
                    
                    // Look for deals that satisfy the full amount the seller lists for their product
                    let list_seller = filter(list_out, 

                      // The outputs are taken from the filtered outputs in the list_out variable above
                      fn(output) { 
                        check_amount(output, datum.price) 
                      }
                    )

                    // The contract will be accepted if the number of outputs sent to the seller checked in the list_seller variable is greater than or equal to one, otherwise the contract will reject the transaction.
                    length(list_seller) >= 1

                  }else{
                    
                    // If the output number satisfying the amount transferred to the author (in the case of seller and author) is less than 2, the transaction will be rejected
                    False
                  }

                }else{

                  // If the buyer is not the seller and satisfies the above outputs, the transaction will be accepted
                  True
                }
              }

              // If one of the 3 outputs above does not exist, the transaction will be rejected
              False -> False
            }
          }
        }
        
      // If the purpose of the transaction is not consumption, the transaction will be rejected
      _ -> False
    }
  }
}
