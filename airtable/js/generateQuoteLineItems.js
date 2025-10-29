//    trigger details:
//    When record matches conditions, this trigger will fire when a record in the chosen table starts matching the provided conditions. This does not include records that already match the conditions.
//    Table:
//    Openings
//    Conditions:
//    When
//    Record Status
//    is
//    Add Line Items
//    
//    
//    action details:
//    Update record
//    Update specific fields, or apply a template to a record. Choose which record to update by selecting its table and record ID.
//    Description:
//    Clear Data
//    
//    Action will run…
//    Always
//    
//    Table:
//    Openings
//    Record ID:
//    ID of the record to update. To update a record from a previous step, use the + menu to choose the step and its Record ID. Must correspond to the selected table.
//    Airtable record ID
//    
//    Fields:
//    Quote Line Items
//    
//    Action will run…
//    Always
//    recordId
//    Airtable record ID

console.log(`Hello, ${base.name}!`);
let openingsTable = base.getTable("Openings");
let quoteLineItemsTable = base.getTable("Quote Line Items");
let hardwareSetItemsTable = base.getTable("Hardware Set Items");

let inputConfig = input.config();
let openingRecord = await openingsTable.selectRecordAsync(inputConfig.recordId);

if (!openingRecord) {
    throw new Error("Opening record not found.");
}

let openingQuantity = openingRecord.getCellValue("Quantity") || 1;
let projectLink = openingRecord.getCellValue("Project")?.[0];

if (!projectLink) {
    throw new Error("Missing project link on opening.");
}

// Helper: create quote line item
async function createLineItem(component, quantity, hardwareSet = null) {
    await quoteLineItemsTable.createRecordAsync({
        "Opening ID": [{ id: openingRecord.id }],
        "Project": [{ id: projectLink.id }],
        "Component": [{ id: component.id }],
        "Quantity": quantity,
        ...(hardwareSet ? { "Hardware Sets": [{ id: hardwareSet.id }] } : {})
    });
}

// 🔹 Door Component
let doorComponent = openingRecord.getCellValue("Door Type")?.[0];
if (doorComponent) {
    await createLineItem(doorComponent, openingQuantity);
}

// 🔹 Frame Component
let frameComponent = openingRecord.getCellValue("Frame Type")?.[0];
if (frameComponent) {
    await createLineItem(frameComponent, openingQuantity);
}

// 🔹 Hardware Components (Multi-select)
let hardwareComponents = openingRecord.getCellValue("Hardware Components") || [];
for (let component of hardwareComponents) {
    await createLineItem(component, openingQuantity);
}

// 🔹 Hardware Set Items
let hardwareSet = openingRecord.getCellValue("Hardware Set Type")?.[0];
if (hardwareSet) {
    let hardwareSetItemsQuery = await hardwareSetItemsTable.selectRecordsAsync();
    let matchingSetItems = hardwareSetItemsQuery.records.filter(item =>
        item.getCellValue("Hardware Set")?.[0]?.id === hardwareSet.id
    );

    for (let item of matchingSetItems) {
        let component = item.getCellValue("Component")?.[0];
        let itemQty = item.getCellValue("Quantity") || 1;
        if (component) {
            await createLineItem(component, openingQuantity * itemQty, hardwareSet);
        }
    }
}
