// Profiling load: when a player joins, give them three partners and send them out, then spawn wild
// pokemon around them. Used only by tools/profile-server.py --client.
PlayerEvents.loggedIn(function (event) {
  var server = event.server;
  var player = event.player;
  server.scheduleInTicks(100, function () {
    var Cobblemon = Java.loadClass("com.cobblemon.mod.common.Cobblemon");
    var Properties = Java.loadClass("com.cobblemon.mod.common.api.pokemon.PokemonProperties");
    var Vec3 = Java.loadClass("net.minecraft.world.phys.Vec3");
    var party = Cobblemon.INSTANCE.getStorage().getParty(player);
    var team = ["pikachu level=50", "charmander level=50", "squirtle level=50"];
    for (var i = 0; i < team.length; i++) {
      var pokemon = Properties.Companion.parse(team[i], " ", "=").create();
      party.add(pokemon);
      var spot = new Vec3(player.x + 2 + i * 2, player.y, player.z + 2);
      pokemon.sendOutWithAnimation(player, player.serverLevel(), spot, null, false, null, function (entity) {});
    }
    var wild = ["zubat", "rattata", "pidgey", "geodude", "machop", "abra"];
    for (var w = 0; w < wild.length; w++) {
      var dx = Math.floor((w % 3) * 6 - 6), dz = Math.floor(w / 3) * 6 + 8;
      server.runCommandSilent("pokespawnat " + Math.floor(player.x + dx) + " " + Math.floor(player.y) + " " + Math.floor(player.z + dz) + " " + wild[w] + " level=30");
    }
    console.info("PROFILE_LOAD ready for " + player.username);
  });
});
