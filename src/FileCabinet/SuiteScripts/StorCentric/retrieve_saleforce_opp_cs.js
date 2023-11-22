/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/ui/dialog'],
	/**
	 * @param {search} search
	 */
	function(search,dialog) {

		/**
		 * Validation function to be executed when field is changed.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 * @param {string} scriptContext.fieldId - Field name
		 * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
		 * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
		 *
		 * @returns {boolean} Return true if field is valid
		 *
		 * @since 2015.2
		 */
		function validateField(scriptContext) {

			var currentRec	= scriptContext.currentRecord

			var forms		= '204,147,158, 151,154, 188, 192';//US Renewals Quote

			var custForm 	= currentRec.getValue('customform');

			if(forms.indexOf(custForm)>-1){

				var fieldName	= scriptContext.fieldId


				log.debug(['custForm','fieldName','currMemo','currTitle'],[custForm,fieldName,currMemo,currTitle]);

				//if Opportunity registration entered
				if (fieldName =='custbody_opportunity_registration'){

					//get the field values so we can check later not to overwrite them if they already have values.
					var currMemo 	= currentRec.getValue('memo');
					var currTitle 	= currentRec.getValue('title');
					var currEndUser	= currentRec.getValue('custbody_end_user');
					var currReseller= currentRec.getValue('custbody1');
					var currOpp		= currentRec.getValue('custbody_sfdc_opp_netsuite_id');

					log.debug(['custForm','fieldName','currMemo','currTitle'],[custForm,fieldName,currMemo,currTitle]);

					var oppReg	= scriptContext.currentRecord.getValue('custbody_opportunity_registration')
					log.debug('oppReg',oppReg);

					//if Opportunity Reg is cleared, then clear some fields
					if(!oppReg && currOpp){
						//if Opportunity number is blanked out.

						currentRec.setValue({
							fieldId	: 'custbody_sfdc_opportunity_18_digit',
							value	: null
						});

						currentRec.setValue({
							fieldId	: 'custbody_sfdc_opp_netsuite_id',
							value	: null
						});

						currentRec.setValue({
							fieldId	: 'custbody_sfdc_stage',
							value	: null
						});

						return true

					}




					//search for the Opportunity details
					var customrecord_sfdc_opportunitiesSearchObj = search.create({
						type: "customrecord_sfdc_opportunities",
						filters:
							[
								["custrecord_sfdc_opp_registration_number","contains",oppReg]
							],
						columns:
							[
								search.createColumn({
									name: "name",
									sort: search.Sort.ASC
								}),
								"custrecord_sfdc_opp_registration_number",
								"custrecord_sfdc_opp_name",
								"custrecord_sfdc_opp_account",
								"custrecord_sfdc_opp_partner_18_digit_key",
								"custrecord_sfdc_opp_x18_digit_key",
								"custrecord_sfdc_opp_stage",
								"custrecord_sfdc_opp_distributor",
								"custrecord_sfdc_opp_nexsan_partner",
								"custrecord_sfdc_opp_partner_account_type",
								"internalid",
								"custrecord_sfdc_opp_ns_billing_id",
								"custrecord_sfdc_opp_stage",
								"custrecord_sfdc_opp_salesrep",
								"custrecord_sfdc_opp_region",
								"custrecordsfdc_opp_close_date",
								"custrecord_sfdc_pricebook2id"
							]
					});
					var searchResultCount = customrecord_sfdc_opportunitiesSearchObj.runPaged().count;
					log.debug("customrecord_sfdc_opportunitiesSearchObj result count",searchResultCount);

					//clear fields if there is not a match Opportunity\
					if (searchResultCount == 0){
						log.debug('clearing fields if there is not a match Opportunity');
						currentRec.setValue({
							fieldId	: 'custbody_sfdc_opportunity_18_digit',
							value	: null
						});
						currentRec.setValue({
							fieldId	: 'custbody_sfdc_opportunity_details',
							value	: 'Opportunity Registration not found!'
						});

						function success(result) { console.log('Success with value: ' + result) }
						function failure(reason) { console.log('Failure: ' + reason) }

						dialog.alert({
							title: 'Opportunity not found ',
							message: 'This Opportunity Registration is not yet found in Netsuite. For new Salesforce registrations please allow 10 minutes for them to be available in Netsuite.'
						}).then(success).catch(failure);


					} else if(searchResultCount == 1){

						customrecord_sfdc_opportunitiesSearchObj.run().each(function(result){
							var columns 	= result.columns;
							var oppReg	 	= result.getValue(columns[0]);
							var oppName 	= result.getValue(columns[2]);
							var acctName 	= result.getValue(columns[3]);
							var partnerKey 	= result.getValue(columns[4]);
							var oppKey 		= result.getValue(columns[5]);
							var stage	 	= result.getValue(columns[6]);
							var oppDist 	= result.getValue(columns[7]);
							var nexsanPartner= result.getValue(columns[8]);
							var partnerType	= result.getValue(columns[9]);
							var oppRecID	= result.getValue(columns[10]);
							var billingId	= result.getValue(columns[11]);
							var oppStage	= result.getValue(columns[12]);
							var salesRep	= result.getValue(columns[13]);
							var regionVal	= result.getValue(columns[14]);
							var expClose	= new Date(result.getValue(columns[15]));
							var priceBook	= result.getValue(columns[16]);

							log.debug('priceBook',priceBook);

							if(oppStage == 'Closed Won'||oppStage == 'Closed Lost'){

								function success(result) { console.log('Success with value: ' + result) }
								function failure(reason) { console.log('Failure: ' + reason) }

								dialog.alert({
									title: 'Opportunity is already '+oppStage,
									message: 'This Opportunity Registration '+oppReg+'-'+oppName+'is already at Salesforce stage '+oppStage+' and cannot be used for new estimates. Please create or use a new registration.'
								}).then(success).catch(failure);

								return
							}

							//we add the full details so the details can be viewed.  the coloured font did not work in record View mode.
							//var fieldVal	= '<font color = "blue">'+oppName+' ('+acctName+')</font>';
							var fieldVal	= oppName+' ('+acctName+')';

							if (oppName){
								log.debug('updating fields');

								/*currentRec.setValue({
                                    fieldId	: 'entity',
                                    value	: billingId
                                });*/

								log.debug('partnerType',partnerType);
								if(partnerType=='Reseller'){
									currentRec.setValue({
										fieldId	: 'custbody1',
										value	: nexsanPartner
									});
								}

								currentRec.setValue({
									fieldId	: 'custbody_sfdc_opportunity_18_digit',
									value	: oppKey
								});
								currentRec.setValue({
									fieldId	: 'custbody_sfdc_opportunity_details',
									value	: fieldVal
								});

								currentRec.setValue({
									fieldId	: 'custbody_sfdc_opp_netsuite_id',
									value	: oppRecID
								});

								currentRec.setValue({
									fieldId	: 'salesrep',
									value	: salesRep
								});
								currentRec.setValue({
									fieldId	: 'custbody_cseg_region',
									value	: regionVal
								});

								currentRec.setValue({
									fieldId	: 'custbody_end_user',
									value	: acctName
								});


								currentRec.setValue({
									fieldId	: 'custbody_celigo_sfio_sf_pricebook_id',
									value	: priceBook
								});

								currentRec.setValue({
									fieldId	: 'custbody_sync_to_salesforce',
									value	: true
								});
								if(!currTitle){
									currentRec.setValue({
										fieldId	: 'title',
										value	: oppName
									});
								}

								if (expClose){
									currentRec.setValue({
										fieldId	: 'expectedclosedate',
										value	: expClose
									});
								}


							}

						});


					}

				}



			}

			return true;
		}



		return {

			validateField: validateField,

		};

	});
