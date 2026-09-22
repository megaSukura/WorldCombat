package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import com.google.gson.*;
import net.minecraft.core.*;
import net.minecraft.core.registries.*;
import net.minecraft.nbt.*;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.phys.AABB;
import net.neoforged.neoforge.common.util.BlockSnapshot;
import net.neoforged.neoforge.event.EventHooks;
import net.neoforged.neoforge.event.level.BlockDropsEvent;
import net.neoforged.neoforge.event.level.BlockEvent;
import java.util.*;

/**
 * Permission-checked block leases. Shapes, materials and expiry are requested by content. A lease normally belongs to the
 * action or effect that placed it and is restored when that scope ends or its source leaves; a lingering lease
 * (`"linger": true`) belongs only to its timer, so ice, spikes or rubble a move leaves behind fade on their own after
 * the move is long over. Shutdown restores safe cells and persists restoration duties for occupied or unloaded cells.
 */
public final class WorldEffects {
    private record Cell(BlockPos pos, BlockState before, BlockState placed) {}
    private record Lease(long id, long owner, ActorHandle actor, UUID source, String dimension, long expiry, boolean linger, List<Cell> cells) {}
    private final MinecraftCombat combat;
    private final Store store;
    private long nextId;
    private boolean writing;
    private record PendingPlacement(BlockEvent.EntityPlaceEvent event, List<PendingCell> cells) {}
    private final List<PendingPlacement> placements = new ArrayList<>();
    private record PendingCell(long leaseId, Cell cell) {}
    private record CellAddress(String dimension, BlockPos pos) {}
    private final Set<PendingCell> broken = new LinkedHashSet<>();
    public WorldEffects(MinecraftCombat combat) {
        this.combat = combat;
        store = combat.server().overworld().getDataStorage().computeIfAbsent(new SavedData.Factory<>(Store::new, Store::read), "worldcombat_terrain");
        for (long id : store.leases.keySet()) nextId = Math.max(nextId, id);
    }
    private record Placement(long id, List<Cell> cells, JsonArray skipped) {
        String json() {
            var result = new JsonObject(); result.addProperty("id", id); var placed = new JsonArray();
            for (var cell : cells) { var point = new JsonArray(); point.add(cell.pos().getX()); point.add(cell.pos().getY()); point.add(cell.pos().getZ()); placed.add(point); }
            result.add("placed", placed); result.add("skipped", skipped); return result.toString();
        }
    }
    private static void skipped(JsonArray result, BlockPos pos, String reason) {
        var entry = new JsonObject(); entry.addProperty("x", pos.getX()); entry.addProperty("y", pos.getY()); entry.addProperty("z", pos.getZ());
        entry.addProperty("reason", reason); result.add(entry);
    }
    public long place(long owner, ActorHandle actor, UUID controllerId, String json, int ticks) {
        return placeBatch(owner, actor, controllerId, json, ticks).id();
    }
    public String placeResult(long owner, ActorHandle actor, UUID controllerId, String json, int ticks) {
        return placeBatch(owner, actor, controllerId, json, ticks).json();
    }
    private Placement placeBatch(long owner, ActorHandle actor, UUID controllerId, String json, int ticks) {
        combat.checkThread();
        settlePlacements();
        if (ticks < 1 || ticks > 12000) throw new IllegalArgumentException("Invalid terrain lifetime");
        var source = combat.resolve(actor);
        if (source == null) throw new ActionInactiveException("Actor left");
        var level = (ServerLevel) source.level();
        var controller = controllerId == null ? null : level.getServer().getPlayerList().getPlayer(controllerId);
        if (controller == null && !EventHooks.canEntityGrief(level, source)) throw new ActionRejectedException("protected-area");
        var root = JsonParser.parseString(json).getAsJsonObject(); var requests = root.getAsJsonArray("cells");
        if (requests == null || requests.isEmpty()) throw new IllegalArgumentException("Expected terrain cells");
        boolean replace = root.has("replace") && root.get("replace").getAsBoolean();
        boolean ground = root.has("ground") && root.get("ground").getAsBoolean();
        boolean linger = root.has("linger") && root.get("linger").getAsBoolean();
        boolean bestEffort = root.has("bestEffort") && root.get("bestEffort").getAsBoolean();
        var cells = new ArrayList<Cell>(); var positions = new HashSet<BlockPos>(); var seen = new HashSet<BlockPos>(); var skipped = new JsonArray();
        for (var value : requests) {
            var request = value.getAsJsonObject();
            var pos = new BlockPos(coordinate(request, "x"), coordinate(request, "y"), coordinate(request, "z"));
            if (!seen.add(pos)) { skipped(skipped, pos, "duplicate-position"); continue; }
            try {
                if (!level.hasChunkAt(pos) || !level.getWorldBorder().isWithinBounds(pos) || level.isOutsideBuildHeight(pos)
                    || source.position().distanceToSqr(pos.getCenter()) > 64 * 64) throw new ActionRejectedException("out-of-range");
                if (level.getBlockEntity(pos) != null || !replace && !level.getBlockState(pos).isAir()) throw new ActionRejectedException("space-occupied");
                if (controller != null && (!level.mayInteract(controller, pos) || !controller.mayUseItemAt(pos, Direction.UP, ItemStack.EMPTY)))
                    throw new ActionRejectedException("protected-area");
                var before = level.getBlockState(pos);
                if (request.has("expectedState") && !before.toString().equals(request.get("expectedState").getAsString()))
                    throw new ActionRejectedException("state-changed");
                if (request.has("block") == request.has("state")) throw new IllegalArgumentException("Expected one terrain block or state");
                BlockState state;
                try { state = NativeBlockStates.parse(level.holderLookup(Registries.BLOCK),
                    request.get(request.has("state") ? "state" : "block").getAsString(), before); }
                catch (com.mojang.brigadier.exceptions.CommandSyntaxException | IllegalArgumentException malformed) {
                    throw new ActionRejectedException("invalid-state");
                }
                var block = state.getBlock();
                if ((state.hasBlockEntity() && !(block instanceof TemporaryRock)) || block instanceof net.minecraft.world.level.block.LiquidBlock
                    || block instanceof net.minecraft.world.level.block.BaseFireBlock || block instanceof net.minecraft.world.level.block.FallingBlock)
                    throw new ActionRejectedException("unsupported-terrain");
                if (before.equals(state)) { skipped(skipped, pos, "unchanged"); continue; }
                if (!state.getCollisionShape(level, pos).isEmpty() && !level.getEntities((net.minecraft.world.entity.Entity) null, new AABB(pos), e -> e.isAlive() && !e.isSpectator()).isEmpty())
                    throw new ActionRejectedException("space-occupied");
                cells.add(new Cell(pos, before, state)); positions.add(pos);
            } catch (ActionRejectedException rejected) {
                if (!bestEffort) throw rejected;
                skipped(skipped, pos, rejected.reason());
            }
        }
        // A skipped support cell can invalidate cells above it; continue until the remaining set is supported.
        boolean removed;
        do {
            removed = false;
            if (ground) for (var iterator = cells.iterator(); iterator.hasNext();) {
                var cell = iterator.next();
                if (!positions.contains(cell.pos().below()) && !level.getBlockState(cell.pos().below()).isFaceSturdy(level, cell.pos().below(), Direction.UP)) {
                    if (!bestEffort) throw new ActionRejectedException("needs-ground");
                    iterator.remove(); positions.remove(cell.pos()); skipped(skipped, cell.pos(), "needs-ground"); removed = true;
                }
            }
        } while (removed);
        if (cells.isEmpty()) return new Placement(0, List.of(), skipped);
        long id = ++nextId;
        var lease = new Lease(id, linger ? 0 : owner, linger ? null : actor, source.getUUID(), level.dimension().location().toString(), level.getGameTime() + ticks, linger, cells);
        var snapshots = new ArrayList<BlockSnapshot>(); var placed = new ArrayList<Cell>();
        writing = true;
        try {
            for (var cell : cells) {
                if (!level.getBlockState(cell.pos()).equals(cell.before())) throw new ActionRejectedException("state-changed");
                snapshots.add(BlockSnapshot.create(level.dimension(), level, cell.pos()));
                if (!level.setBlock(cell.pos(), cell.placed(), 3)) throw new ActionRejectedException("space-occupied");
                placed.add(cell);
                if (level.getBlockEntity(cell.pos()) instanceof TemporaryRock.Lease rock)
                    rock.initialize(new UUID(0, id), source.getUUID(), lease.expiry());
            }
            // Native protection cancellation remains atomic, including in best-effort mode.
            if (EventHooks.onMultiBlockPlace(controller == null ? source : controller, snapshots, Direction.UP)) throw new ActionRejectedException("protected-area");
            // A successful replacement takes over the cell's restoration duty, not the previous temporary material.
            // Keep the observed states above for rollback until every protection listener has accepted the placement.
            var owned = new ArrayList<Cell>();
            for (var cell : cells) {
                owned.add(new Cell(cell.pos(), original(level, cell.pos(), cell.before()), cell.placed()));
                forget(level, cell.pos());
            }
            store.leases.put(id, new Lease(id, lease.owner(), lease.actor(), lease.source(), lease.dimension(), lease.expiry(), lease.linger(), owned));
            store.setDirty(); return new Placement(id, cells, skipped);
        } catch (RuntimeException error) {
            for (var cell : placed) if (level.getBlockState(cell.pos()).equals(cell.placed())) level.setBlock(cell.pos(), cell.before(), 3);
            if (bestEffort && error instanceof ActionRejectedException rejected) {
                for (var cell : cells) skipped(skipped, cell.pos(), rejected.reason());
                return new Placement(0, List.of(), skipped);
            }
            throw error;
        } finally { writing = false; }
    }
    private static int coordinate(JsonObject value, String key) {
        double number = value.get(key).getAsDouble();
        if (!Double.isFinite(number) || number != Math.rint(number) || Math.abs(number) > 30000000) throw new IllegalArgumentException("Invalid terrain coordinate");
        return (int) number;
    }
    /** A placement event can still be cancelled by another listener. Inspect its final result after event dispatch. */
    public void placed(BlockEvent.EntityPlaceEvent event) {
        if (writing || !(event.getLevel() instanceof ServerLevel level)) return;
        var positions = new HashSet<BlockPos>();
        if (event instanceof BlockEvent.EntityMultiPlaceEvent multi)
            for (var snapshot : multi.getReplacedBlockSnapshots()) positions.add(snapshot.getPos());
        else positions.add(event.getPos());
        var cells = new ArrayList<PendingCell>();
        for (var lease : store.leases.values()) if (lease.dimension().equals(level.dimension().location().toString()))
            for (var cell : lease.cells()) if (positions.contains(cell.pos())) cells.add(new PendingCell(lease.id(), cell));
        if (!cells.isEmpty()) placements.add(new PendingPlacement(event, cells));
    }
    private void settlePlacements() {
        for (var placement : placements) if (!placement.event().isCanceled()) {
            for (var pending : placement.cells()) {
                var lease = store.leases.get(pending.leaseId());
                if (lease == null || !lease.cells().remove(pending.cell())) continue;
                if (lease.cells().isEmpty()) { store.leases.remove(lease.id()); store.restoring.remove(lease.id()); }
                store.setDirty();
            }
        }
        placements.clear();
    }
    private void forget(ServerLevel level, BlockPos pos) {
        boolean changed = false;
        for (var iterator = store.leases.values().iterator(); iterator.hasNext();) {
            var lease = iterator.next();
            if (!lease.dimension().equals(level.dimension().location().toString())) continue;
            changed |= lease.cells().removeIf(cell -> cell.pos().equals(pos));
            if (lease.cells().isEmpty()) { store.restoring.remove(lease.id()); iterator.remove(); }
        }
        if (changed) store.setDirty();
    }
    private BlockState original(ServerLevel level, BlockPos pos, BlockState observed) {
        // Walking backwards also unwinds overlapping cells saved by older versions.
        var leases = new ArrayList<>(store.leases.values());
        for (int i = leases.size() - 1; i >= 0; i--) {
            var lease = leases.get(i);
            if (lease.dimension().equals(level.dimension().location().toString()))
                for (var cell : lease.cells()) if (cell.pos().equals(pos) && (cell.placed().equals(observed) || removed(observed, cell))) { observed = cell.before(); break; }
        }
        return observed;
    }
    /** Temporary materials never become harvestable items or experience; ordinary neighbouring blocks are untouched. */
    public void drops(BlockDropsEvent event) {
        if (writing) return;
        settlePlacements();
        for (var lease : store.leases.values()) if (lease.dimension().equals(event.getLevel().dimension().location().toString()))
            for (var cell : lease.cells()) if (cell.pos().equals(event.getPos()) && cell.placed().equals(event.getState())) {
                broken.add(new PendingCell(lease.id(), cell));
                event.getDrops().clear(); event.setDroppedExperience(0); event.setCanceled(true); return;
            }
    }
    /** Observe the attempt; the world state next tick, after every protection listener, decides whether it happened. */
    public void breaking(BlockEvent.BreakEvent event) {
        if (writing || !(event.getLevel() instanceof ServerLevel level)) return;
        settlePlacements();
        for (var lease : store.leases.values()) if (lease.dimension().equals(level.dimension().location().toString()))
            for (var cell : lease.cells()) if (cell.pos().equals(event.getPos()) && cell.placed().equals(event.getState()))
                broken.add(new PendingCell(lease.id(), cell));
    }
    public void remove(ActorHandle actor, long id) {
        settlePlacements();
        var lease = store.leases.get(id);
        if (lease != null && (lease.actor() != null ? lease.actor().identity().equals(actor.identity()) : lease.source().equals(actor.entity()))) restore(lease);
    }
    public boolean owns(UUID id, ServerLevel level, BlockPos position) {
        if (id == null || id.getMostSignificantBits() != 0) return false;
        var lease = store.leases.get(id.getLeastSignificantBits());
        return lease != null && lease.dimension().equals(level.dimension().location().toString())
            && lease.cells().stream().anyMatch(cell -> cell.pos().equals(position));
    }
    public void release(long owner, String reason) {
        settlePlacements();
        for (var lease : List.copyOf(store.leases.values())) if (lease.owner() == owner) restore(lease);
    }
    private static boolean occupied(ServerLevel world, Cell cell) {
        if (cell.before().getCollisionShape(world, cell.pos()).isEmpty()) return false;
        return !world.getEntities((net.minecraft.world.entity.Entity) null, new AABB(cell.pos()), e -> e instanceof net.minecraft.world.entity.LivingEntity && e.isAlive() && !e.isSpectator()).isEmpty();
    }
    private void restore(Lease lease) {
        store.restoring.add(lease.id());
        store.setDirty();
        var level = combat.server().getAllLevels().iterator(); ServerLevel world = null;
        while (level.hasNext()) { var candidate = level.next(); if (candidate.dimension().location().toString().equals(lease.dimension())) world = candidate; }
        if (world == null) return;
        writing = true;
        try {
            for (var iterator = lease.cells().iterator(); iterator.hasNext();) {
                var cell = iterator.next(); if (!world.hasChunkAt(cell.pos())) continue;
                if (world.getBlockState(cell.pos()).equals(cell.placed()) || removed(world, cell)) {
                    // A wall closing or ground coming back must not entomb whoever is standing there: keep that cell open and try again next tick.
                    if (occupied(world, cell)) continue;
                    if (!world.getBlockState(cell.pos()).equals(cell.before()) && !world.setBlock(cell.pos(), cell.before(), 3)) continue;
                }
                iterator.remove();
            }
            if (lease.cells().isEmpty()) { store.leases.remove(lease.id()); store.restoring.remove(lease.id()); }
            store.setDirty();
        } finally { writing = false; }
    }
    public void tick() {
        settlePlacements();
        reclaimBroken();
        long now = combat.server().overworld().getGameTime();
        for (var lease : List.copyOf(store.leases.values())) {
            if (store.restoring.contains(lease.id())) { restore(lease); continue; }
            if (lease.linger()) { if (now >= lease.expiry()) restore(lease); continue; }
            var source = lease.actor() == null ? null : combat.resolve(lease.actor());
            if (source == null || source.level().getGameTime() >= lease.expiry()) restore(lease);
        }
    }
    private static boolean removed(ServerLevel level, Cell cell) {
        return removed(level.getBlockState(cell.pos()), cell);
    }
    private static boolean removed(BlockState current, Cell cell) {
        // Air itself may be the requested temporary state (an opening), so it is not a broken cover.
        return !cell.placed().isAir() && !current.equals(cell.placed())
            && (current.isAir() || current.equals(cell.placed().getFluidState().createLegacyBlock())
                // IceBlock.playerDestroy writes source water after its drops callback; ice itself has an empty fluid state.
                || cell.placed().getBlock() instanceof net.minecraft.world.level.block.IceBlock
                    && current.equals(net.minecraft.world.level.block.Blocks.WATER.defaultBlockState()));
    }
    private void reclaimBroken() {
        writing = true;
        try {
            // Only attempted breaks are revisited; active terrain does not add a per-cell world scan every tick.
            for (var iterator = broken.iterator(); iterator.hasNext();) {
                var pending = iterator.next(); var lease = store.leases.get(pending.leaseId()); var cell = pending.cell();
                if (lease == null || !lease.cells().contains(cell)) { iterator.remove(); continue; }
                var worlds = combat.server().getAllLevels().iterator(); ServerLevel level = null;
                while (worlds.hasNext()) { var candidate = worlds.next(); if (candidate.dimension().location().toString().equals(lease.dimension())) level = candidate; }
                if (level == null || !level.hasChunkAt(cell.pos())) continue;
                if (!removed(level, cell)) { iterator.remove(); continue; }
                if (occupied(level, cell)) continue;
                if (!level.getBlockState(cell.pos()).equals(cell.before()) && !level.setBlock(cell.pos(), cell.before(), 3)) continue;
                lease.cells().remove(cell); iterator.remove();
                if (lease.cells().isEmpty()) { store.leases.remove(lease.id()); store.restoring.remove(lease.id()); }
                store.setDirty();
            }
        } finally { writing = false; }
    }
    public void stop() { settlePlacements(); for (var lease : List.copyOf(store.leases.values())) restore(lease); }
    public int count() { return store.leases.size(); }
    private static final class Store extends SavedData {
        final Map<Long, Lease> leases = new LinkedHashMap<>();
        final Set<Long> restoring = new HashSet<>();
        static Store read(CompoundTag tag, HolderLookup.Provider provider) {
            var result = new Store(); var rows = tag.getList("Leases", Tag.TAG_COMPOUND);
            for (int i = 0; i < rows.size(); i++) {
                var row = rows.getCompound(i); var cells = new ArrayList<Cell>(); var list = row.getList("Cells", Tag.TAG_COMPOUND);
                for (int j = 0; j < list.size(); j++) { var cell = list.getCompound(j);
                    cells.add(new Cell(BlockPos.of(cell.getLong("Pos")), NbtUtils.readBlockState(provider.lookupOrThrow(Registries.BLOCK), cell.getCompound("Before")),
                        NbtUtils.readBlockState(provider.lookupOrThrow(Registries.BLOCK), cell.getCompound("Placed")))); }
                long id = row.getLong("Id"); result.leases.put(id, new Lease(id, 0, null, row.getUUID("Source"), row.getString("Dimension"), row.getLong("Expiry"), row.getBoolean("Linger"), cells));
                if (row.getBoolean("Restoring")) result.restoring.add(id);
            }
            // Older saves may contain overlapping leases. The latest owner keeps the earliest connected original,
            // so expiry order cannot leave a previous temporary material behind after loading a world.
            var owners = new HashMap<CellAddress, PendingCell>();
            for (var lease : result.leases.values()) for (var cells = lease.cells().listIterator(); cells.hasNext();) {
                var cell = cells.next(); var address = new CellAddress(lease.dimension(), cell.pos());
                var previous = owners.get(address);
                if (previous != null && previous.leaseId() != lease.id()) {
                    var prior = previous.cell();
                    if (cell.before().equals(prior.placed()) || removed(cell.before(), prior)) {
                        cell = new Cell(cell.pos(), prior.before(), cell.placed()); cells.set(cell);
                    }
                    result.leases.get(previous.leaseId()).cells().remove(prior);
                }
                owners.put(address, new PendingCell(lease.id(), cell));
            }
            result.leases.values().removeIf(lease -> lease.cells().isEmpty());
            result.restoring.retainAll(result.leases.keySet());
            return result;
        }
        @Override public CompoundTag save(CompoundTag tag, HolderLookup.Provider provider) {
            var list = new ListTag();
            for (var lease : leases.values()) {
                var row = new CompoundTag(); row.putLong("Id", lease.id()); row.putUUID("Source", lease.source()); row.putString("Dimension", lease.dimension()); row.putLong("Expiry", lease.expiry()); row.putBoolean("Linger", lease.linger());
                row.putBoolean("Restoring", restoring.contains(lease.id()));
                var cells = new ListTag();
                for (var cell : lease.cells()) { var data = new CompoundTag(); data.putLong("Pos", cell.pos().asLong()); data.put("Before", NbtUtils.writeBlockState(cell.before())); data.put("Placed", NbtUtils.writeBlockState(cell.placed())); cells.add(data); }
                row.put("Cells", cells); list.add(row);
            }
            tag.put("Leases", list); return tag;
        }
    }
}
