Working with Springpad User Exports
===================================

It's with the deepest regret that we're announcing the shutdown of the Springpad service. It's been our honor and
privilege to have had so many users trust us with their data over the past 6 years. As we plan the shutdown of our
service we're doing our best to ensure that users are able to get their data and move it to other services.

The purpose of this repository is to help other developers understand the Springpad export format so that they
can build importers into their own applications. In addition to this documentation, this repository also contains
an example of a Springpad user export that contains examples of the different types of data that you can expect to find.


Contents
========
- [Contents of the Export Archive](#contents)
- [JSON Export Format](#json-format)


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

<a name="type:object"/>
## Springpad Object Properties

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|uuid|[ID](datatype:id)| |A unique ID|
|name|String| |Name or title of the object|
|type|[Type](#datatype:type)| |Type of the object|
|public|Boolean| |Is this public or not?|
|liked|Boolean| |Did the user mark this liked?|
|complete|Boolean| |Springpad objects can be marked complete (e.g., is the task done? has the movie been watched?)|
|tags|Array of Strings| |List of tags|
|notebooks|Array of [IDs](datatype:id)| |List of notebook IDs that this object is in. The notebooks are defined in export.json file as well.|
|image|[Link](#datatype:link)| |Representative image for the object. Can be `null`|
|created|[Date](#datatype:date)| |Creation date|
|modified|[Date](#datatype:date)| |Modified date|
|description|String| ✓ |Description or summary|
|url|String| ✓ |URL for the object. In the case of a block that was scraped, the URL it was scraped from.|


## Type-Specific Properties

The rest of the document examines properties available for each Springpad object type.

<a name="type:note"/>
### Note

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|text|String| ✓ |The contents of the note (may be HTML-formatted)|

<a name="type:task"/>
### Task

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|complete|Boolean|   |Is the task complete or not (this property was referenced above as well)|
|date|[Date](#datatype:date)| ✓ |Due date|

<a name="type:appointment"/>
### Appointment

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|date|[Date](#datatype:date)| ✓ |Due date|
|allDay|Boolean| ✓ |Is the appointment all day|
|addresses|List of [Addresses](#datatype:address)| ✓ |Addresses|
|frequency|[Frequency](#datatype:frequency)| ✓ |Frequency of repeating|


<a name="type:reminder"/>
### Reminder

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|notes|String| ✓ ||
|date|[Date](#datatype:date)| ✓ |Reminder date|

<a name="type:bookmark"/>
### Bookmark

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|url|String|   |URL of the bookmark|

<a name="type:checklist"/>
### Checklist

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|items|List of [ChecklistItem](#datatype:checklistitem)|   ||

<a name="type:contact"/>
### Contact

An address book entry.

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|company|String| ✓ |Company the contact works for|
|title|String| ✓ |Title of the contact|
|addresses|Map of address name to address| ✓ |Addresses (e.g., home, work, second home.)|
|phone numbers|Map of phone/fax name to phone number| ✓ |Phone numbers (e.g., home, cell, fax)|
|accounts|Map of account name to value| ✓ |Used for things like IM accounts, email addresses, websites, etc|

<a name="type:file"/>
### File

The url property will provide a link to the actual file (generally, in the attachments directory).

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|mime-type|String| ✓ |Type of the file|

<a name="type:audio"/>
### Audio

The url property will provide a link to the actual audio file.

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|duration|Integer| ✓ |Number of seconds|

<a name="type:place"/>
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

<a name="type:product"/>
### Product

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|price|String| ✓ ||
|manufacturer|String| ✓ ||
|model|String| ✓ ||

<a name="type:book"/>
### Book

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|author|String| ✓ ||
|price|String| ✓ ||
|publication date|[Date](#datatype:date)| ✓ ||
|cover|String| ✓ |(e.g. hard or soft cover)|
|genres|List of Strings| ✓ ||
|level|String| ✓ |reading level|
|isbn|String| ✓ ||

<a name="type:tvshow"/>
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

<a name="type:movie"/>
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
|release date|[Date](#datatype:date)| ✓ ||

<a name="type:wine"/>
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

<a name="type:album"/>
### Album

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|artist|String| ✓ ||
|price|String| ✓ ||
|format|String| ✓ ||
|genres|List of Strings| ✓ ||
|release date|[Date](#datatype:date)| ✓ ||

<a name="type:musician"/>
### Musician/Band

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|bio|String| ✓ ||
|genres|List of Strings| ✓ ||
|record labels|List of Strings| ✓ ||
|members|List of Strings| ✓ ||

<a name="type:recipe"/>
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

<a name="type:notebook"/>
### Notebook

| Name | Type | Optional | Description |
|------|------|:--------:|-------------|
|category|String| ✓ ||
|item count|Integer|   |Number of items in the notebook|


## Property Types

<a name="datatype:type"/>
<a name="datatype:id"/>
<a name="datatype:link"/>
<a name="datatype:date"/>
<a name="datatype:address"/>
<a name="datatype:checklistitem"/>
<a name="datatype:frequency"/>
