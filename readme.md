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

Get Skill Information
    - **?skill** *[name]*

Get Equipment Information
    - **?equip** *[name]*

Get Best Units
    - **?bestunits**

Get Unit Sprite
    - **?sprite** *[name]*

Get Unit GIFs
    - **?gif** *[name]* "[parameter]"
    - parameters: 'attack.gif',  'dead.gif',  
                  'dying.gif', 'idle.gif',  'jump.gif',  'limit.gif',
                  'magic attack.gif',  'magic standby.gif',  'move.gif',  
                  'standby.gif',  'win.gif',  'win before.gif' 

Get Unit Calculations
    - **?dpt** *[unit name -or- category]* "[optional | limit]"
    - **?burst** *[unit name -or- category]* "[optional | limit]"
    - optional: the amount of results to return, default is 5.
    - categories: "physical", "magical", "hybrid"