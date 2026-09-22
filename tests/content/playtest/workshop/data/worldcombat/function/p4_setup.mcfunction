function worldcombat:p4_partner {properties:"pikachu level=20 moves=thundershock,watergun,charge,growl"}
function worldcombat:p4_partner {properties:"squirtle level=20 moves=withdraw,watergun,growl,thundershock"}
give @s cobblemon:ether 8
give @s cobblemon:rare_candy 2
give @s cobblemon:oran_berry 4
fill ~-2 ~-1 ~-3 ~15 ~-1 ~6 minecraft:smooth_stone
summon minecraft:cow ~6 ~ ~ {NoAI:1b,PersistenceRequired:1b,Tags:["wc_p4_target","wc_p4_a"],CustomName:'{"text":"开阔靶 A"}',CustomNameVisible:1b}
summon minecraft:cow ~9 ~ ~ {NoAI:1b,PersistenceRequired:1b,Tags:["wc_p4_target","wc_p4_b"],CustomName:'{"text":"传播靶 B"}',CustomNameVisible:1b}
summon minecraft:cow ~12 ~ ~ {NoAI:1b,PersistenceRequired:1b,Tags:["wc_p4_target","wc_p4_c","wc_p4_insulated"],CustomName:'{"text":"绝缘靶 C"}',CustomNameVisible:1b}
execute as @e[tag=wc_p4_target] run attribute @s minecraft:generic.max_health base set 100
execute as @e[tag=wc_p4_target] run attribute @s minecraft:generic.knockback_resistance base set 1
execute as @e[tag=wc_p4_target] run data merge entity @s {Health:100.0f}
summon minecraft:cow ~3 ~ ~4 {PersistenceRequired:1b,Tags:["wc_p4_listener"],CustomName:'{"text":"声音观察者"}',CustomNameVisible:1b}
tp @s ~ ~ ~ -90 10
tellraw @s {"text":"P4 场景已就绪。G 调整伙伴；皮卡丘：Z 持续电流、X 三点水路、C 选择场地后链接、V 声音诱饵。","color":"aqua"}
