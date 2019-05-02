## Bot Commands ##
(replace ? with your servers prefix)

Search
    - **?search** *[term]*

Get Unit Information
    - **?unit** *[name] [optional | parameter]*
    - optional: Add parameters to shorten the results for only desired information 
                **contained in quotes**
    - example: **?unit Malphasie "STMR"**  | this will only return malphasie's STMR
    - parameters: "Name", "Limited", "Exclusive", 
                  "Job", "Role", "Origin", 
                  "Gender", "STMR", "Trust", 
                  "Race", "Number", "Chain", "Rarity"

Get Unit Skill Information
    - **?unitname** *search*
    - **?kit** [unit name] "[search terms]* (will return both passives and actives)
    - **?ability** [unit name] "[search terms]" (will return only active abilities)
    - **?passive** [unit name] "[search terms]" (will return only passive abilities)
    - Search a units skill set for any keywords to return the skills that match.
    - example: **?noctis** fire
    - parameters: keywords can be separated by the pipe character (|).
        Or separated into quotes for each, "one" "two" "three"

Get Skill Information
    - **?skill** *[name]*
    - example: **?skill Bolting Strike**

Get Equipment Information
    - **?equip** *[name]*
    - example: **?equip Asterisk**

Get Unit Sprite
    - **?sprite** *[name]*
    - example: **?sprite Esther**

Get Unit GIFs, quotations are required
    - **?gif** *[name]* "[parameter]"
    - parameters: 'attack',  'dead',  
                  'dying', 'idle',  'jump',  'limit',
                  'magic attack',  'magic standby',  'move',  
                  'standby',  'win',  'win before'
    - example: **?gif Esther "attack"**

Get Unit Calculations
    - **?dpt** *[unit name -or- category]* "[limit]"
    - **?burst** *[unit name -or- category]* "[limit]"
    - optional: the amount of results to return, default is 5.
    - categories: "physical", "magical", "hybrid"
    - example: **?dpt Esther**
    - example: **?burst hybrid "10"**

Get Best Units
    - **?glbestunits**

Get Information
    - **?whatis** *[search]*
    - example: **?whatis elemental tetris**