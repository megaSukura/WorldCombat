// A brief independently leased pincer grip, subject to ordinary native status acceptance.
StartupEvents.registry("mob_effect",event=>event.create("world_combat:visegrip_hold").harmful().color(0xE89080)
    .tag("world_combat:status/rooted").tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed","world_combat:visegrip_hold",-1,"add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed","world_combat:visegrip_hold_flight",-1,"add_multiplied_total")
    .effectTick((entity:any,amplifier:number)=>{}));
