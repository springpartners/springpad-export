Working with Springpad User Exports
===================================

It's with the deepest regret that we're announcing Springpad shutting down. It's been a pleasure to serve our users over the past
6 years and to work with many of you in the developer community. As we plan for the termination of the service, we are committed to
enabling users to get their data and to help provide them options for importing it into other services.

The purpose of this repository is to help developers understand the Springpad export format so that they
can build importers for other services or applications. In addition to this documentation, this repository also contains
a sample Springpad user export that contains examples of the different types of objects that you can expect to find.

If you have any questions about the shutdown please start with [this post](https://springpad.com/tk?code=1on6uji0fgu11c&url=https%3A%2F%2Fspringpad.com%2Fblog%2F2014%2F05%2Fspringpad-says-goodbye%2F) on our blog.
And for any development-related questions please use [our mailing list](https://groups.google.com/forum/#!forum/springpaddev).

Contents
========

- [Contents of the Export Archive](#contents)
- [JSON Export Format](#json-format)
- [Creating an importer: Case study](#case-study-importer)


<a name="contents"/>
## Contents of the Export Archive

After a user completes an export of their account, they receive an email containing a download link to a zip archive.
This archive contains:

- **attachments**/
- **viewer_data**/
- export.json
- README.txt
- viewer.html

The `viewer_data` directory and `viewer.html` file provide a way for the user to view their account offline and therefore
aren't of concern for a developer performing an import. The `export.json` is a complete dump of all of the objects in the
user's account. Its format is described in the [next section](#json-format). The `attachments` directory contains any
user uploaded images or other attached files. These files are referenced in the export JSON file.


<a name="json-format"/>
## JSON Export Format

The `export.json` file contains all of the objects in the user's account. This includes notes, tasks, checklists, notebooks, etc.
The file is structured as a list of JSON objects, each JSON object being a unique Springpad object. Each object has a type
that defines what properties it will have. For example, a "Book" has an author while a "Movie" has directors and a "Note" has text.
We'll define all of the possible properties for each type of object below, but first, let's look at the properties that all
Springpad objects have in common.

<a name="type-object"/>
## Springpad Object Properties

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|uuid|[ID](#datatype-id)| |A unique ID|
|name|String| |Name or title of the object|
|type|[Type](#datatype-type)| |Type of the object|
|public|Boolean| |Is this public or not?|
|liked|Boolean| |Did the user mark this liked?|
|rating|Integer| ✓ |Rating of the object (0-5)|
|complete|Boolean| |Springpad objects can be marked complete (e.g., is the task done? has the movie been watched?)|
|tags|Array of Strings| |List of tags|
|notebooks|Array of [IDs](datatype-id)| |List of notebook IDs that this object is in. The notebooks are defined in export.json file as well.|
|image|[Link](#datatype-link)| |Representative image for the object. Can be `null`|
|created|[Date](#datatype-date)| |Creation date|
|modified|[Date](#datatype-date)| |Modified date|
|description|String| ✓ |Description or summary|
|url|String| ✓ |URL for the object. In the case of a block that was scraped, the URL it was scraped from.|


## Type-Specific Properties

The rest of the document examines properties available for each Springpad object type.

<a name="type-note"/>
### Note

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|text|String| ✓ |The contents of the note (may be HTML-formatted)|

<a name="type-task"/>
### Task

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|complete|Boolean|   |Is the task complete or not (this property was referenced above as well)|
|date|[Date](#datatype-date)| ✓ |Due date|

<a name="type-appointment"/>
### Appointment

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|date|[Date](#datatype-date)| ✓ |Due date|
|allDay|Boolean| ✓ |Is the appointment all day|
|addresses|Map of address name to address| ✓ |Addresses|
|repeats|[Frequency](#datatype-frequency)| ✓ |Frequency of repeating|


<a name="type-reminder"/>
### Reminder

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|notes|String| ✓ ||
|date|[Date](#datatype-date)| ✓ |Reminder date|
|repeats|[Frequency](#datatype-frequency)| ✓ |Frequency of repeating|

<a name="type-bookmark"/>
### Bookmark

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|url|String|   |URL of the bookmark|

<a name="type-checklist"/>
### Checklist

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|items|List of [ChecklistItem](#datatype-checklistitem)|   ||

<a name="type-contact"/>
### Contact

An address book entry.

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|company|String| ✓ |Company the contact works for|
|title|String| ✓ |Title of the contact|
|addresses|Map of address name to address| ✓ |Addresses (e.g., home, work, second home.)|
|phone numbers|Map of phone/fax name to phone number| ✓ |Phone numbers (e.g., home, cell, fax)|
|accounts|Map of account name to value| ✓ |Used for things like IM accounts, email addresses, websites, etc|

<a name="type-file"/>
### File

The url property will provide a link to the actual file (generally, in the attachments directory).

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|mime-type|String| ✓ |Type of the file|

<a name="type-audio"/>
### Audio

The url property will provide a link to the actual audio file.

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|duration|Integer| ✓ |Number of seconds|

<a name="type-place"/>
### Place

A business or restaurant.

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|cuisines|List of Strings| ✓ |Restaurant-only property|
|neighborhood|String| ✓ |Restaurant-only property|
|price|String| ✓ |How spendy is the restaurant?|
|menu url|String| ✓ |Restaurant-only property|
|addresses|Map of address name to address| ✓ |Addresses|
|phone numbers|Map of phone/fax name to phone number| ✓ |Phone numbers (e.g., phone, fax)|
|accounts|Map of account name to value| ✓ |Used for things like email addresses, websites, etc|

<a name="type-product"/>
### Product

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|price|String| ✓ ||
|manufacturer|String| ✓ ||
|model|String| ✓ ||

<a name="type-book"/>
### Book

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|author|String| ✓ ||
|price|String| ✓ ||
|publication date|[Date](#datatype-date)| ✓ ||
|cover|String| ✓ |(e.g. hard or soft cover)|
|genres|List of Strings| ✓ ||
|level|String| ✓ |reading level|
|isbn|String| ✓ ||

<a name="type-tvshow"/>
### TV Show

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|cast|List of Strings| ✓ ||
|directors|List of Strings| ✓ ||
|writers|List of Strings| ✓ ||
|producers|List of Strings| ✓ ||
|awards|List of Strings| ✓ ||
|rated|String| ✓ ||
|plot|String| ✓ ||
|season|String| ✓ ||

<a name="type-movie"/>
### Movie

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|cast|List of Strings| ✓ ||
|directors|List of Strings| ✓ ||
|writers|List of Strings| ✓ ||
|producers|List of Strings| ✓ ||
|awards|List of Strings| ✓ ||
|rated|String| ✓ ||
|runtime|String| ✓ ||
|release date|[Date](#datatype-date)| ✓ ||

<a name="type-wine"/>
### Wine

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|varietal|String| ✓ ||
|vintage|String| ✓ ||
|label|String| ✓ ||
|price|String| ✓ ||
|wine type|String| ✓ ||
|region|String| ✓ ||
|ratings|List of Strings| ✓ ||

<a name="type-album"/>
### Album

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|artist|String| ✓ ||
|price|String| ✓ ||
|format|String| ✓ ||
|genres|List of Strings| ✓ ||
|release date|[Date](#datatype-date)| ✓ ||

<a name="type-musician"/>
### Musician/Band

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|bio|String| ✓ ||
|genres|List of Strings| ✓ ||
|record labels|List of Strings| ✓ ||
|members|List of Strings| ✓ ||

<a name="type-recipe"/>
### Recipe

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|cuisine|String| ✓ ||
|course|String| ✓ ||
|ingredients|String| ✓ ||
|directions|String| ✓ ||
|main ingredient|String| ✓ ||
|servings|String| ✓ ||
|source|String| ✓ |URL to the source of the recipe|

<a name="type-notebook"/>
### Notebook

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|category|String| ✓ ||
|item count|Integer|   |Number of items in the notebook|


## Property Types

<a name="datatype-type"/>
### Type

A JSON string defining the type of an object.

It will be one of:
- Note
- Task
- Appointment
- Reminder
- Bookmark
- Checklist
- Contact
- File
- Photo
- Audio
- Place
- Product
- Book
- TV Show
- Movie
- Wine
- Album
- Musician/Band
- Recipe
- Notebook
- Frequency

Example:

`"Note"`.

<a name="datatype-id"/>
### ID

Springpad uses UUID strings to uniquely identify objects.

Example:

 `"0d368c7b-f941-49f5-8510-614a8ce74c78"`

<a name="datatype-link"/>
### Link

Links can either be URLs to a resource on the internet or relative link to a file
in the attachments directory of the export.

Examples:

- `"http://example.com/img.gif"`
- `"attachments/MV5BMjA3NzMyMzU1MV5BMl5BanBnXkFtZTcwNjc1ODUwMg@@._V1._SY317_CR17,0,214,317_.jpg"`

<a name="datatype-date"/>
### Date

Dates are [ISO-8601](http://en.wikipedia.org/wiki/ISO_8601)-formatted and include time and timezone.

Example:

`"2014-03-13T17:03:34+0000"`

<a name="datatype-checklistitem"/>
### ChecklistItem

ChecklistItems are JSON objects containing with a boolean `complete` property and
a string `name` property.

Examples:

- `{"complete": true, "name": "walk the dog"}`
- `{"complete": false, "name": "take out the trash"}`

<a name="datatype-frequency"/>
### Frequency

Frequencies are JSON objects that convey how frequently and if an event or alarm repeats. A description of each property is below but the examples below that probably provide the best way to understand these objects.

A frequency object may contain the following the properties:

- `type` this will always be equal to `Frequency` and all Frequency objects have it
- `text` this is an English-language explanation of the frequency of the event and all Frequency objects have it
- `repeats` this is the type of frequency: `Never`, `Daily`, `Weekdays`, `Weekly`, `Monthly By Day Of Month`, `Monthly By Day Of Week`, `Yearly`
- `repeat every` used for daily, weekly, monthly, and year frequencies this means repeat every **n** days/weeks/months/years where **n** is the value of `repeat every`
- `on days` used for weekly frequencies this is a JSON object with properties: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun` mapping to booleans that if true mean it should repeat on that day

Examples:

```json
{
    "text":"every 6 days",
    "repeat every":6,
    "repeats":"Daily",
    "type":"Frequency"
}
```

```json
{
    "text":"every 4 months on the day of week",
    "repeat every":4,
    "repeats":"Monthly By Day Of Week",
    "type":"Frequency"
}v
```

```json
{
    "text":"every month on the day",
    "repeat every":1,
    "repeats":"Monthly By Day Of Month",
    "type":"Frequency"
}
```

```json
{
    "text":"every 2 weeks on mon and wed",
    "repeat every":2,
    "repeats":"Weekly",
    "on days":
      {
      "mon":true,
      "tue":false,
      "wed":true,
      "thu":false,
      "fri":false,
      "sat":false,
      "sun":false
      },
    "type":"Frequency"
}
```

```json
{
    "text":"weekdays",
    "repeats":"Weekdays",
    "type":"Frequency"
}
```

```json
{
    "text":"never",
    "repeats":"Never",
    "type":"Frequency"
}
```

```json
{
    "text":"every day",
    "repeat every":1,
    "repeats":"Daily",
    "type":"Frequency"
}
```

```json
{
    "text":"every 3 years",
    "repeat every":3,
    "repeats":"Yearly",
    "type":"Frequency"
}
```

## Case study

<a name="case-study-importer"/>
### Creating an importer

Included in this repository under Example_Springpad_Export is a sample dataset that demonstrates a number of different Springpad types and permutations of data properties. Using this sample is a great starting point for those who wish to build an importer for Springpad users’ data. The contents of each export archive are discussed above; this section describes the steps a developer may take to start building an importer.

### Aligning with Springpad data

For the purposes of this document, let’s assume that a fictional productivity website, foo-organize.com, will be building an importer. Foo-organize provides a productivity functionality (notes, checklists, reminders) alongside a bookmarking + web-scraping service. Not all Springpad data is appropriate to their app, but most data will be  transferrable with a bit of creativity. The steps below are merely illustrative, but may serve to highlight some high-level considerations you should make when building an importer.

Generally, Springpad’s objects can be divided into two general buckets; productivity types (notes, checklists, reminders, events) and reference types (bookmarks, recipes, products, etc). Many instances of reference types will have a URL as a source, making them candidates for data imports into bookmarking services.

**Step 0:** Foo-organize reads about the Springpad’s data model and export contents. It’s determined that both productivity types and reference types can be imported, with only a small loss of data.

### Upload

Before using a third-party importing service, Springpad users will be required to have downloaded a `.zip` archive containing the contents of their export. An importing service should provide a mechanism for users to upload the entire zip, although certain applications may wish to only use the contents of `export.json`. 

**Step 1:** Foo-organize builds a mechanism for uploading Springpad export archives

### Pre-processing

As described earlier in this document, the contents of `export.json` contain all objects in a user’s Springpad account. The organizational methodology of Springpad is that objects can be either organized in one or more Notebooks (which themselves are an object) or be un-filed (no notebook membership).

**Step 2:** Foo-organize first scans `export.json` for objects of type `notebook` to come up with a set of Notebooks that can be referenced later.

### Munging and Wrangling the objects

Springpad’s data model is unlikely to have a one-to-one relationship with those of other services, but with a bit of creativity it’s possible to retain most (or all) of a user’s data. 

**Step 3:** Foo-organize is hierarchically flat, and uses tagging as an organizational methodology — in other words, there are no folders or notebooks. To reconcile this difference, the importer’s UI lets users opt-in to tag items contained within a Springpad notebook with the name of the notebook. E.g. if user `kyle` has a notebook named `sports` with 10 bookmarks, each bookmark will be tagged with `sports` in addition to its pre-existing tags during import. Un-filed items will likewise be tagged with `unfiled`.

Some data types of Springpad may not be directly transferrable to other services. In this case, it may be prudent to allow the user to choose which types and/or notebooks to import, and also to provide a mechanism for preserving data when possible by using other types as containers for data that the user may still wish to access.

**Step 4:** Foo-organize’s importer concatenates the data fields of types it doesn’t support, like `Contact` and `Wine` into a string that is saved as a note. 

**Step 5:** The service, upon completion, notifies users of any data field, attachments, and/or objects that were unable to be imported.
