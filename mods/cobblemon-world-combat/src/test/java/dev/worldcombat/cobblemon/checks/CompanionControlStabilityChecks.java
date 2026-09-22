package dev.worldcombat.cobblemon.checks;

import com.cobblemon.mod.common.Cobblemon;
import com.cobblemon.mod.common.api.moves.Moves;
import com.cobblemon.mod.common.api.pokemon.PokemonProperties;
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.cobblemon.mod.common.pokemon.Pokemon;
import com.mojang.authlib.GameProfile;
import dev.worldcombat.cobblemon.control.CompanionControl;
import dev.worldcombat.cobblemon.network.*;
import dev.worldcombat.cobblemon.script.NativeContentChannels;
import dev.worldcombat.cobblemon.script.NativeContentSubscriptions;
import dev.worldcombat.core.checks.TestWorld;
import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.CombatServices;
import io.netty.channel.embedded.EmbeddedChannel;
import net.minecraft.network.Connection;
import net.minecraft.network.PacketSendListener;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.PacketFlow;
import net.minecraft.network.protocol.common.ClientboundCustomPayloadPacket;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ClientInformation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.CommonListenerCookie;
import net.minecraft.server.network.ServerGamePacketListenerImpl;
import net.minecraft.server.players.PlayerList;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.GameType;
import net.minecraft.world.phys.Vec3;
import java.util.*;

/** Real inspected views, native death/respawn, native party changes and production control requests. */
public final class CompanionControlStabilityChecks {
    private static final CompanionControl CONTROL = CompanionControl.INSTANCE;
    private static int age;
    private static boolean done;
    private static ServerPlayer owner, departed;
    private static List<ServerPlayer> listed;
    private static AutoCloseable lease;
    private static final List<EmbeddedChannel> channels = new ArrayList<>();
    private static final List<Delivery> deliveries = new ArrayList<>();
    private record Delivery(ServerPlayer recipient, Object payload) {}
    private static Pokemon pokemon, second;
    private static PokemonEntity actor, partner;
    private static CompanionControl.Session session;
    private static CompanionControl.Body body;
    private static ActorHandle handle;
    private static UUID liveSession;
    private static int pp, invalidations;
    private static long contentSequence;

    private static void connect(MinecraftServer server, ServerPlayer player) {
        var connection = new Connection(PacketFlow.SERVERBOUND);
        channels.add(new EmbeddedChannel(connection));
        player.connection = new ServerGamePacketListenerImpl(server, connection, player, CommonListenerCookie.createInitial(player.getGameProfile(), false)) {
            @Override public void send(Packet<?> packet) {
                if (packet instanceof ClientboundCustomPayloadPacket data) deliveries.add(new Delivery(player, data.payload()));
            }
            @Override public void send(Packet<?> packet, PacketSendListener listener) { send(packet); }
            @Override public void tick() {}
        };
    }
    private static Pokemon pokemon(String species, String move) {
        var result = PokemonProperties.Companion.parse(species + " level=40").create(null);
        result.getMoveSet().clear(); result.getMoveSet().add(Objects.requireNonNull(Moves.INSTANCE.getByName(move)).create());
        var content = new net.minecraft.nbt.CompoundTag();
        content.putString("world_combat:preferences/growth", "{\"version\":1,\"patch\":{\"autoPrepare\":false}}");
        var root = new net.minecraft.nbt.CompoundTag(); root.put("Content", content); result.getPersistentData().put("WorldCombat", root);
        return result;
    }
    private static PokemonEntity send(Pokemon value, double x) {
        var result = value.getEntity();
        if (result == null || !result.isAlive()) result = value.sendOut(owner.serverLevel(), new Vec3(x,100,2),null, ignored -> kotlin.Unit.INSTANCE);
        return Objects.requireNonNull(result);
    }
    private static void inspect() {
        var current = CONTROL.session(owner);
        int start = deliveries.size();
        NativeContentChannels.INSTANCE.request(owner, new ContentRequest(current.getId(), ++contentSequence, CombatServices.CONTENT.epoch(),
            owner.server.getTickCount(), "world_combat:skills", pokemon.getUuid(), "{\"op\":\"inspect\",\"move\":\"growth\"}"));
        require(deliveries.subList(start, deliveries.size()).stream().anyMatch(d -> d.payload instanceof ContentReply r && r.code().equals("ok")), "Real detail request failed");
    }
    private static void command(String operation, int slot) {
        var current = CONTROL.session(owner); var selected = current.getActor();
        var snapshot = CONTROL.snapshot(current);
        CONTROL.request(owner, new ControlCommand(current.getId(), current.getGate().lastSequence()+1, current.getEpoch(), owner.server.getTickCount(),
            selected.entity(), selected.generation(), current.getPartySlot(), operation, slot,
            operation.equals("cast") ? selected.entity() : ControlCommand.NONE, new Point(3,100,2), new Point(1,0,0),
            operation.equals("cast") ? snapshot.skills().get(slot).version() : ""));
    }
    private static void stable() {
        require(CONTROL.session(owner) == session, "Native invalidation replaced the current player session after respawn");
        require(session.getBody() == body && Objects.equals(session.getActor(),handle), "Selected Body/ActorHandle changed without selection");
        require(session.getIntent().equals("stay"), "Native invalidation reset the issued stay order: " + session.getIntent());
        var snapshot=CONTROL.snapshot(session);
        require(snapshot.session().equals(liveSession) && snapshot.generation()==handle.generation() && snapshot.members().size()==2, "Control snapshot lost current session or deployed roster");
        for (var delivery:deliveries) {
            if (delivery.payload instanceof ControlState state) require(delivery.recipient==owner && state.session().equals(liveSession), "State packet used retired player/session");
            if (delivery.payload instanceof ContentInvalidation state) { require(delivery.recipient==owner && state.session().equals(liveSession), "Invalidation packet used retired player/session"); invalidations++; }
        }
        deliveries.clear();
    }
    private static void require(boolean value,String message) { if(!value) throw new AssertionError(message); }
    private static void close() throws Exception {
        if(listed!=null) { listed.remove(owner); listed.remove(departed); }
        if(owner!=null) owner.discard();
        if(lease!=null) lease.close();
        for(var channel:channels) channel.close();
    }
    @SuppressWarnings("unchecked")
    public static void tick(MinecraftServer server) {
        if(done || !CombatServices.CONTENT.ready()) return;
        try {
            if(owner!=null && !owner.isRemoved()) owner.doTick();
            age++;
            switch(age) {
                case 1 -> {
                    var level=TestWorld.prepare(server); level.setDayTime(6000); level.setWeatherParameters(12000,0,false,false);
                    owner=new ServerPlayer(server,level,new GameProfile(UUID.randomUUID(),"P5ControlOwner"),ClientInformation.createDefault());
                    connect(server,owner); owner.moveTo(2,100,4,0,0); owner.setGameMode(GameType.CREATIVE);
                    lease=TestWorld.mockOwner(server,owner);
                    var field=PlayerList.class.getDeclaredField("players"); field.setAccessible(true); listed=(List<ServerPlayer>)field.get(server.getPlayerList()); listed.add(owner);
                    PokemonServerChecks.INSTANCE.initializeTestData(owner.getUUID()); level.addNewPlayer(owner);
                    pokemon=pokemon("bulbasaur","growth"); second=pokemon("ivysaur","splash");
                    require(Cobblemon.INSTANCE.getStorage().getParty(owner).add(pokemon),"First party insert failed");
                    require(Cobblemon.INSTANCE.getStorage().getParty(owner).add(second),"Second party insert failed");
                    actor=send(pokemon,3); partner=send(second,7);
                }
                case 30 -> {
                    inspect(); departed=owner;
                    server.getCommands().performPrefixedCommand(server.createCommandSourceStack(),"kill @a");
                    require(owner.isDeadOrDying(),"Native kill failed");
                    System.out.println("P5CHECK native details subscribed before kill; ticking native death");
                }
                case 60 -> {
                    require(owner.deathTime>=20 && owner.isRemoved(),"Native death removal did not occur");
                    owner=server.getPlayerList().respawn(owner,false,Entity.RemovalReason.KILLED); connect(server,owner);
                    owner.teleportTo(2,100,4); owner.serverLevel().getChunkSource().move(owner);
                    require(owner!=departed && owner.getUUID().equals(departed.getUUID()),"Native player clone identity was not exercised");
                    actor=send(pokemon,3); partner=send(second,7);
                }
                case 90 -> {
                    session=CONTROL.session(owner); CONTROL.advance(session); require(session.getMembers().size()==2,"Two deployed members unavailable");
                    command("stay",0); body=session.getBody(); handle=session.getActor(); liveSession=session.getId();
                    require(session.getIntent().equals("stay"),"Stay command failed: "+session.getReason());
                    deliveries.clear(); inspect(); pp=pokemon.getMoveSet().get(0).getCurrentPp();
                    System.out.println("P5CHECK live replacement player has two members, stay order and fresh detail subscription");
                }
                case 100 -> {
                    pokemon.onChange(null); NativeContentSubscriptions.INSTANCE.flush(server); stable();
                    command("cast",0); require(session.getReason().equals("accepted"),"Manual growth refused: "+session.getReason());
                    require(CombatServices.get(server).runtime().state(handle).stage().equals("preparing"),"Manual growth did not enter preparation");
                    pokemon.onChange(null); NativeContentSubscriptions.INSTANCE.flush(server); stable();
                }
                case 180 -> {
                    require(CombatServices.get(server).runtime().state(handle).stage().equals("finished"),"Manual growth was interrupted: "+CombatServices.get(server).runtime().state(handle));
                    require(pokemon.getMoveSet().get(0).getCurrentPp()==pp-1,"Manual growth did not pay exactly one native PP");
                    require(invalidations>0,"Live subscription did not deliver native invalidation");
                    boolean refused=false;
                    try { CONTROL.session(departed); } catch(ActionInactiveException expected) { refused=true; }
                    require(refused,"Retired player could recreate a current control session"); stable();
                    close();done=true;System.out.println("P5CHECK PASS inspected views survive native death/respawn: stable session, two members, persistent order, current packets, complete manual cast and once-only PP");
                }
            }
            if(age>100 && age<180) {
                if(age%3==0) { pokemon.onChange(null); NativeContentSubscriptions.INSTANCE.flush(server); }
                stable();
            }
        } catch(Throwable error) {
            done=true;System.out.println("P5CHECK FAIL control stability at "+age+": "+error.getMessage());error.printStackTrace();
            try { close(); } catch(Exception ignored) {}
        }
    }
}
