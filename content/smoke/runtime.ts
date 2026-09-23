/**
 * Smoke stage: builds the arena each scenario.ts describes, records what WorldCombat reports while the AI fights,
 * evaluates the scenario's expectations and prints a verdict per scenario; the server stops after the last one.
 * Several units can share one server run: every scenario gets a fresh arena 200 blocks further along x, so what
 * one move leaves in the world stays out of the next move's stage. Loaded only by tools/smoke-unit.py.
 * Everything here talks to the running server through KubeJS globals; content units never do.
 */
declare const Java: any;
declare const ServerEvents: any;
declare const console: any;

namespace Smoke {
    interface Entry { ref: string; name: string; entity: any; spawnAt: number[]; lastAt: number[]; travelled: number; }
    interface Scenario { id: string; build: (stage: Stage) => void; }
    var review: any = Java.loadClass("java.lang.Boolean").getBoolean("worldcombat.review") ? Java.loadClass("dev.worldcombat.cobblemon.review.ReviewTool") : null;
    var reviewRequests: any[] = [], reviewOptions: any = {}, reviewPrimary = false, reviewTarget = false;
    if (review) review.bind(function (json: any) { reviewRequests.push(JSON.parse(String(json))); });
    var queue: Scenario[] = [], index = -1, scenarioId = "", builder: ((stage: Stage) => void) | null = null;
    // Superflat surface of the smoke world (grass top at y = -61); the stage repaves a 48-block square with stone.
    var server: any = null, level: any = null, centre = [0, -60, 0], startedAt = -1, tickNow = 0, finished = false, stopped = false;
    var actors: Entry[] = [], failures: string[] = [], expectations = 0;
    var casts: { [key: string]: number } = {}, damageIn: { [ref: string]: number } = {}, damageOut: { [ref: string]: number } = {};
    var effectsSeen: { [key: string]: boolean } = {}, blocksBefore: { [key: string]: string } = {};
    var timers: { at: number; run: () => void }[] = [], polls: { limit: number; check: () => boolean; run: () => void; label: string }[] = [];
    var watched: { at: number[]; before: string }[] = [];
    var scopeSequence = 0, scopeCalls: { [id: string]: (scope: CombatWorld) => void } = Object.create(null);
    /** Fresh synchronous scope; setup and reads never wait for an unrelated combat event. */
    function withWorld<T>(entry: Entry, run: (scope: CombatWorld) => T): T {
        if (!entry || !entry.entity.isAlive()) throw new Error("Arena scope needs a living actor");
        var combat = Java.loadClass("dev.worldcombat.core.world.CombatServices").get(server);
        var actor = combat.bind(entry.entity), token = String(++scopeSequence), seen = false, failed = false, error: any, value: T;
        scopeCalls[token] = function (scope) { seen = true; try { value = run(scope); } catch (failure) { failed = true; error = failure; } };
        try {
            var reply = combat.runtime().event("checks:smoke/scope", actor, null, JSON.stringify({ token: token }), true);
            if (!seen || String(reply.rejection())) throw new Error("Arena world scope unavailable: " + String(reply.rejection()));
            if (failed) throw error;
            return value!;
        } finally { delete scopeCalls[token]; }
    }
    WorldCombat.on("checks:smoke/scope", "checks:smoke/scope", "", function (event) {
        var callback = scopeCalls[String(JSON.parse(String(event.data())).token)];
        if (callback) callback(event.world());
    });
    var receipts: { at: number[]; amount: number; critical: boolean; fromRef: string; toRef: string; from: string; to: string; cause: string }[] = [];
    var hitsOut: { [ref: string]: number } = {}, hitsIn: { [ref: string]: number } = {}, criticalsOut: { [ref: string]: number } = {};

    function out(kind: string, data: any): void { data.kind = kind; data.tick = tickNow; console.info("SMOKE " + JSON.stringify(data)); if (review) review.event(JSON.stringify(data)); }
    function refOf(actor: CombatActor): string { return String(actor.ref()); }
    function owner(ref: string): Entry | null { for (var i = 0; i < actors.length; i++) if (ref.indexOf(actors[i].ref) === 0) return actors[i]; return null; }
    function nameOf(actor: CombatActor | null): string { if (!actor) return "-"; var found = owner(refOf(actor)); return found ? found.name : refOf(actor); }
    function world(at: number[]): number[] { return [centre[0] + at[0], centre[1] + at[1], centre[2] + at[2]]; }
    function key(at: number[]): string { return at.join(","); }
    function blockId(at: number[]): string {
        var BlockPos = Java.loadClass("net.minecraft.core.BlockPos"), Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
        var p = world(at); return String(Registries.BLOCK.getKey(level.getBlockState(new BlockPos(p[0], p[1], p[2])).getBlock()));
    }
    function place(at: number[], id: string): void { var p = world(at); server.runCommandSilent("setblock " + p[0] + " " + p[1] + " " + p[2] + " " + id); blocksBefore[key(at)] = id; }

    function wrap(entry: Entry): Actor {
        return { ref: entry.ref, name: entry.name,
            health: function () { return entry.entity.isAlive() ? entry.entity.getHealth() : 0; },
            position: function () { var v = entry.entity.position(); return [Number(v.x()), Number(v.y()), Number(v.z())]; },
            alive: function () { return entry.entity.isAlive(); } };
    }
    /** Registry ids of every tag the mob effect carries, so shared identities such as world_combat:status/burn are visible by name. */
    function effectTags(holder: any): string[] {
        var tags: string[] = [], it = holder.tags().iterator();
        while (it.hasNext()) tags.push(String(it.next().location()));
        return tags;
    }
    function activeEffects(entity: any): { id: string; tags: string[] }[] {
        var Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries"), found: { id: string; tags: string[] }[] = [], it = entity.getActiveEffects().iterator();
        while (it.hasNext()) { var holder = it.next().getEffect(); found.push({ id: String(Registries.MOB_EFFECT.getKey(holder.value())), tags: effectTags(holder) }); }
        return found;
    }
    function uuidOf(entity: any): string { var value = entity.uuid !== undefined ? entity.uuid : entity.stringUUID; return String(value); }
    function register(entity: any, name: string, at: number[], added: boolean = false): Actor {
        var p = world(at); entity.setPos(p[0], p[1], p[2]); if (typeof entity.setPersistenceRequired === "function") entity.setPersistenceRequired(); if (!added && !(review && review.isPlayer(entity))) level.addFreshEntity(entity);
        if (review) name=String(review.label(entity));
        var entry: Entry = { ref: uuidOf(entity) + "/", name: name, entity: entity, spawnAt: p, lastAt: p, travelled: 0 };
        actors.push(entry); out("spawn", { name: name, at: p }); return wrap(entry);
    }
    function entryOf(actor: Actor): Entry { for (var i = 0; i < actors.length; i++) if (actors[i].ref === actor.ref) return actors[i]; throw new Error("Unknown actor " + actor.name); }
    function pokemonOf(entry: Entry): any {
        var entity = entry.entity;
        return typeof entity.getPokemon === "function" ? entity.getPokemon() : entity.pokemon || null;
    }
    function ppOf(entry: Entry, moveId: string): number | null {
        var pokemon = pokemonOf(entry); if (!pokemon) return null;
        var moves = pokemon.getMoveSet().getMoves();
        for (var i = 0; i < moves.size(); i++) {
            var move = moves.get(i);
            if (move && String(move.getName()).toLowerCase() === moveId.toLowerCase()) return Number(move.getCurrentPp());
        }
        return null;
    }
    function heldStack(entry: Entry): any {
        var pokemon = pokemonOf(entry);
        var stack = pokemon ? pokemon.heldItem() : entry.entity.getMainHandItem();
        if (!pokemon && stack.isEmpty()) stack = entry.entity.getOffhandItem();
        return stack;
    }
    function heldOf(entry: Entry): string {
        var stack = heldStack(entry);
        if (!stack || stack.isEmpty()) return "";
        var Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
        return String(Registries.ITEM.getKey(stack.getItem()));
    }
    function fail(label: string): void { failures.push(label); out("fail", { label: label }); }
    function finish(): void {
        if (finished) return; finished = true;
        var verdict = failures.length ? "FAIL" : "PASS";
        out("verdict", { verdict: verdict, expectations: expectations, failures: failures, casts: casts, damageIn: damageIn, damageOut: damageOut });
        console.info("SMOKE_VERDICT " + verdict + " " + scenarioId + " " + failures.length + "/" + expectations);
        if (!review && index + 1 >= queue.length) { stopped = true; console.info("SMOKE_ALL_DONE " + queue.length); server.runCommandSilent("stop"); }
    }
    /** Clears the finished arena's fighters and moves on: the next scenario starts on untouched ground 200 blocks along x. */
    function advance(): void {
        if (index >= 0) {
            actors.forEach(function (e) { try { e.entity.discard(); } catch (ignored) { } });
            server.runCommandSilent("forceload remove " + (centre[0] - 48) + " " + (centre[2] - 48) + " " + (centre[0] + 48) + " " + (centre[2] + 48));
        }
        index++; var next = queue[index]; scenarioId = next.id; builder = next.build;
        centre = [200 * index, -60, 0]; finished = false; startedAt = -1;
        actors = []; failures = []; expectations = 0; casts = {}; damageIn = {}; damageOut = {}; effectsSeen = {}; blocksBefore = {}; timers = []; polls = [];
        watched = []; receipts = []; hitsOut = {}; hitsIn = {}; criticalsOut = {};
    }

    var stage: Stage = {
        pokemon: function (spec) {
            var Properties = Java.loadClass("com.cobblemon.mod.common.api.pokemon.PokemonProperties"), Moves = Java.loadClass("com.cobblemon.mod.common.api.moves.Moves");
            var Entity = Java.loadClass("com.cobblemon.mod.common.entity.pokemon.PokemonEntity"), Entities = Java.loadClass("com.cobblemon.mod.common.CobblemonEntities");
            var isPrimary = !!review && !reviewPrimary && spec.moves.indexOf(scenarioId) >= 0;
            if (isPrimary) reviewPrimary=true;
            var selectedSpecies = isPrimary && reviewOptions.species ? reviewOptions.species : spec.species;
            var selectedLevel = isPrimary && reviewOptions.level ? reviewOptions.level : spec.level || 30;
            var text = selectedSpecies + " level=" + selectedLevel + (spec.ability ? " ability=" + spec.ability : "") + (spec.item ? " held_item=" + spec.item : "") + (spec.properties ? " " + spec.properties : "");
            var pokemon = Properties.Companion.parse(text, " ", "=").create();
            var set = pokemon.getMoveSet(); set.clear();
            for (var i = 0; i < spec.moves.length; i++) { var template = Moves.getByName(spec.moves[i]); if (!template) throw new Error("Unknown move " + spec.moves[i]); set.setMove(i, template.create()); }
            if (spec.status) {
                var Statuses = Java.loadClass("com.cobblemon.mod.common.api.pokemon.status.Statuses"), Location = Java.loadClass("net.minecraft.resources.ResourceLocation");
                var status = Statuses.INSTANCE.getStatus(Location.parse(spec.status.indexOf(":") < 0 ? "cobblemon:" + spec.status : spec.status));
                if (!status) throw new Error("Unknown status " + spec.status); pokemon.applyStatus(status);
            }
            var at=world(spec.at), body: any;
            var ownedPrimary = isPrimary && reviewOptions.mode !== "ai" && reviewOptions.mode !== "duel";
            if (ownedPrimary) {
                // Keep the tested move in slot one; extra slots remain available for real combination input.
                var first=Moves.getByName(scenarioId); set.clear(); set.setMove(0,first.create());
                var extra=1; spec.moves.forEach(function(id){if(id!==scenarioId && extra<4) set.setMove(extra++,Moves.getByName(id).create());});
                body=review.owned(pokemon,at[0],at[1],at[2]);
            } else body=(!isPrimary && reviewPrimary ? reviewReplacement() : null) || new Entity(level,pokemon,Entities.POKEMON);
            var result=register(body, selectedSpecies+"@"+selectedLevel, spec.at, ownedPrimary);
            if (isPrimary) review.focus(body);
            return result;
        },
        mob: function (spec) {
            var Location = Java.loadClass("net.minecraft.resources.ResourceLocation"), Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
            var type = Registries.ENTITY_TYPE.get(Location.parse(spec.type)); var entity = reviewReplacement() || type.create(level);
            if (!entity) throw new Error("Cannot create " + spec.type); if (typeof entity.setPersistenceRequired === "function") entity.setPersistenceRequired(); return register(entity, spec.type, spec.at);
        },
        hostile: function (a, b) { if (review && reviewOptions.mode === "details") return; var ea = entryOf(a).entity, eb = entryOf(b).entity; if (typeof ea.setTarget === "function") ea.setTarget(eb); if (typeof eb.setTarget === "function") eb.setTarget(ea); if (review) review.look(eb); out("hostile", { a: a.name, b: b.name }); },
        team: function (name, members) {
            server.runCommandSilent("team add " + name);
            members.forEach(function (member) { server.runCommandSilent("team join " + name + " " + uuidOf(entryOf(member).entity)); });
            out("team", { name: name, members: members.map(function (m) { return m.name; }) });
        },
        block: function (at, id) { place(at, id); },
        fill: function (from, to, id) {
            for (var x = Math.min(from[0], to[0]); x <= Math.max(from[0], to[0]); x++) for (var y = Math.min(from[1], to[1]); y <= Math.max(from[1], to[1]); y++)
                for (var z = Math.min(from[2], to[2]); z <= Math.max(from[2], to[2]); z++) blocksBefore[key([x, y, z])] = id;
            var a = world(from), b = world(to); server.runCommandSilent("fill " + a.join(" ") + " " + b.join(" ") + " " + id);
        },
        weather: function (kind) { server.runCommandSilent("weather " + kind); },
        time: function (kind) { server.runCommandSilent("time set " + kind); },
        command: function (text) { server.runCommandSilent("execute positioned " + centre.join(" ") + " run " + text); },
        after: function (ticks, run) { timers.push({ at: tickNow + ticks, run: run }); },
        until: function (limit, check, run, label) { polls.push({ limit: review && review.manual() ? Number.POSITIVE_INFINITY : tickNow + limit, check: check, run: run, label: label }); },
        expect: function (condition, label) { expectations++; if (condition) out("pass", { label: label }); else fail(label); },
        note: function (text, data) { out("note", { text: text, data: data === undefined ? null : data }); },
        done: function () { finish(); },
        casts: function (moveId, actor) {
            var total = 0; Object.keys(casts).forEach(function (k) { var parts = k.split(" "); if (parts[0] === "world_combat:" + moveId && (!actor || parts[1].indexOf(actor.ref) === 0)) total += casts[k]; }); return total;
        },
        damageTo: function (actor) { return damageIn[actor.ref] || 0; },
        damageBy: function (actor) { return damageOut[actor.ref] || 0; },
        hadMobEffect: function (actor, idOrTag) { return !!effectsSeen[actor.ref + " " + idOrTag]; },
        hasMobEffect: function (actor, idOrTag) {
            return activeEffects(entryOf(actor).entity).some(function (effect) { return effect.id === idOrTag || effect.tags.indexOf(idOrTag) >= 0; });
        },
        travelled: function (actor) { return entryOf(actor).travelled; },
        attribute: function (actor, id) {
            var Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries"), Location = Java.loadClass("net.minecraft.resources.ResourceLocation");
            var holder = Registries.ATTRIBUTE.getHolder(Location.parse(id));
            if (!holder.isPresent()) throw new Error("Unknown attribute " + id);
            return Number(entryOf(actor).entity.getAttributeValue(holder.get()));
        },
        tick: function () { return tickNow; },
        changedBlocks: function () {
            var changed: { at: number[]; before: string; after: string }[] = [], seen: { [key: string]: boolean } = {};
            function check(at: number[], before: string): void {
                var k = at.join(","); if (seen[k]) return; seen[k] = true;
                var now = blockId(at); if (now !== before) changed.push({ at: at, before: before, after: now });
            }
            Object.keys(blocksBefore).forEach(function (k) { check(k.split(",").map(Number), blocksBefore[k]); });
            for (var i = 0; i < watched.length; i++) check(watched[i].at, watched[i].before);
            return changed;
        },
        blockAt: function (at) { return blockId(at); },
        watch: function (from, to) {
            for (var x = Math.min(from[0], to[0]); x <= Math.max(from[0], to[0]); x++)
                for (var y = Math.min(from[1], to[1]); y <= Math.max(from[1], to[1]); y++)
                    for (var z = Math.min(from[2], to[2]); z <= Math.max(from[2], to[2]); z++) watched.push({ at: [x, y, z], before: blockId([x, y, z]) });
        },
        stages: function (actor) {
            return withWorld(entryOf(actor), function (scope) { var result: { [stat: string]: number } = {};
                CombatStages.stats.forEach(function (stat) { result[stat] = NativeEffects.effectiveStage(scope, scope.source(), stat); }); return result; });
        },
        boost: function (actor, values) { withWorld(entryOf(actor), function (scope) {
            Object.keys(values).forEach(function (stat) { NativeEffects.boost(scope, scope.source(), stat, values[stat], true, "checks:smoke", "setup"); });
        }); },
        setPp: function (actor, moveId, value) {
            var pokemon = pokemonOf(entryOf(actor)); if (!pokemon) throw new Error("PP requires a Pokemon");
            if (!isFinite(value) || value < 0 || value % 1) throw new Error("PP must be a nonnegative integer");
            var moves = pokemon.getMoveSet().getMoves();
            for (var i = 0; i < moves.size(); i++) { var move = moves.get(i); if (move && String(move.getName()).toLowerCase() === moveId.toLowerCase()) {
                move.setCurrentPp(value); return;
            } }
            throw new Error("Move is not equipped: " + moveId);
        },
        pp: function (actor, moveId) { return ppOf(entryOf(actor), moveId); },
        heldItem: function (actor) { return heldOf(entryOf(actor)); },
        heldDamage: function (actor) { var stack = heldStack(entryOf(actor)); return stack && stack.isDamageableItem() ? Number(stack.getDamageValue()) : null; },
        hits: function (actor, incoming) { return (incoming ? hitsIn[actor.ref] : hitsOut[actor.ref]) || 0; },
        criticals: function (actor) { return criticalsOut[actor.ref] || 0; },
        damageEvents: function (cause) {
            return receipts.filter(function (r) { return !cause || r.cause.indexOf(cause) >= 0; })
                .map(function (r) { return { at: r.at, amount: r.amount, critical: r.critical, from: r.from, to: r.to, cause: r.cause }; });
        },
        hurt: function (actor, amount, damageType, options) {
            var target = entryOf(actor), source = options && options.source ? entryOf(options.source) : target;
            withWorld(source, function (scope) {
                var combat = Java.loadClass("dev.worldcombat.core.world.CombatServices").get(server), data: any = {};
                Object.keys(options && options.metadata || {}).forEach(function (key) { data[key] = options!.metadata![key]; });
                data.damageType = damageType || "minecraft:generic";
                scope.hurt(combat.bind(target.entity), amount, JSON.stringify(data));
            });
        },
        field: function (rule, at, ticks, radius, data, source) {
            withWorld(source ? entryOf(source) : actors[0], function (scope) {
                if (!WorldEffects.hasFieldRule(rule)) throw new Error("Unknown field rule: " + rule);
                var p = world(at);
                WorldEffects.field(scope, rule, WorldCombat.point(p[0], p[1], p[2]), radius === undefined ? 3 : radius, data === undefined ? {} : data, ticks);
            });
        },
        noai: function (...list) {
            for (var i = 0; i < list.length; i++) {
                var entity = entryOf(list[i]).entity;
                server.runCommandSilent("data merge entity " + uuidOf(entity) + " {NoAI:1b}");
            }
        },
        provoke: function (a, b) {
            var source = entryOf(a).entity, target = entryOf(b).entity;
            if (typeof source.setTarget === "function") source.setTarget(target);
        },
        prefer: function (actor, moveId, patch) {
            withWorld(entryOf(actor), function (scope) {
                var target = scope.source(), pokemon = CobblemonCombat.pokemon(target);
                CompanionRepertoire.catalogue.preferences.update(moveId, String(pokemon.id()), patch, CompanionRepertoire.catalogue.storage(scope, target));
            });
        }
    };

    export function scenario(id: string, build: (s: Stage) => void): void {
        if (queue.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate scenario " + id);
        queue.push({ id: id, build: build }); if (review) review.registerScenario(id);
    }
    function clearReview(): void {
        actors.forEach(function (entry) { try { if (!review.isPlayer(entry.entity)) entry.entity.discard(); } catch (ignored) {} });
        if (startedAt >= 0) {
            // Remove only the old dedicated arena's fixtures and release its forced chunks.
            review.clearArea(centre[0],centre[1],centre[2]);
            server.runCommandSilent("forceload remove " + (centre[0]-48) + " " + (centre[2]-48) + " " + (centre[0]+48) + " " + (centre[2]+48));
        }
        review.clearFixtures();
    }
    function freeTarget(at: number[]): Actor {
        var spec=JSON.parse(String(review.freeSpec())), result: Actor;
        if (spec.variant === "player") {
            var player=review.player(), v=player.position();
            result=register(player,"player",[Number(v.x())-centre[0],Number(v.y())-centre[1],Number(v.z())-centre[2]],true);
        } else if (spec.variant === "pokemon" || spec.friendly) {
            result=stage.pokemon({species:spec.targetSpecies||"blissey",level:Number(spec.targetLevel||50),moves:String(spec.targetMoves||"tackle").split(",").filter(Boolean),at:at});
        } else result=stage.mob({type:spec.mob||"minecraft:iron_golem",at:at});
        if (!review.isPlayer(entryOf(result).entity)) review.targetBehavior(entryOf(result).entity,!!spec.active && !spec.friendly);
        if (spec.friendly) {
            server.runCommandSilent("team add wc_review_friends");
            server.runCommandSilent("team join wc_review_friends "+uuidOf(entryOf(result).entity));
        }
        return result;
    }
    function freeBuild(s: Stage): void {
        var spec=JSON.parse(String(review.freeSpec()));
        var subject=s.pokemon({species:spec.species,level:Number(spec.level),moves:[scenarioId],at:[0,0,0],properties:spec.properties||""});
        var player=review.player();
        server.runCommandSilent("team add wc_review_friends");
        server.runCommandSilent("team join wc_review_friends "+uuidOf(player));
        if (reviewOptions.mode === "duel") {
            var v=player.position();
            var human=register(player,"player",[Number(v.x())-centre[0],Number(v.y())-centre[1],Number(v.z())-centre[2]],true);
            s.hostile(subject,human);
        } else {
            server.runCommandSilent("team join wc_review_friends "+uuidOf(entryOf(subject).entity));
            var count=spec.variant==="player"?1:Math.max(1,Number(spec.count||1));
            for(var i=0;i<count;i++) {
                var target=freeTarget([(i-(count-1)/2)*3,0,-7]);
                if(spec.active && !spec.friendly && !review.isPlayer(entryOf(target).entity)) s.hostile(target,subject);
            }
        }
        s.note("自由试验场：使用真实伙伴指挥和技能输入，场景不会自行给出通过结论。");
    }
    function reviewRequest(input: any): void {
        if (input.op === "start") {
            var found = -1; for (var i=0;i<queue.length;i++) if (queue[i].id === input.move) found=i;
            var free=input.mode==="free"||input.mode==="duel";
            if (!free && found < 0) { out("fail", {label:"Missing authored scenario: "+input.move}); return; }
            clearReview(); index=Math.max(0,found); scenarioId=input.move; builder=free?freeBuild:queue[index].build;
            reviewOptions=input; reviewPrimary=false; reviewTarget=false;
            centre=[200*Number(input.serial), -60, 0]; finished=false; stopped=false; startedAt=-1;
            actors=[]; failures=[]; expectations=0; casts={}; damageIn={}; damageOut={}; effectsSeen={}; blocksBefore={}; timers=[]; polls=[];
            watched=[]; receipts=[]; hitsOut={}; hitsIn={}; criticalsOut={};
            review.scenePosition(centre[0],centre[1],centre[2]);
        } else if(input.op === "arena" && review.freePlay() && actors.length) {
            var op=String(input.action), spec=JSON.parse(String(review.freeSpec()));
            if(op==="add-target") freeTarget([(actors.length-1)%5*3-6,0,-9-Math.floor((actors.length-1)/5)*3]);
            else if(op==="clear-targets") { actors.slice(1).forEach(function(e){if(!review.isPlayer(e.entity)) e.entity.discard();}); actors=actors.slice(0,1); }
            else if(op==="engage"||op==="cease") {
                actors.forEach(function(e,i){
                    if(review.isPlayer(e.entity)|| (i===0&&reviewOptions.mode==="free")) return;
                    review.targetBehavior(e.entity,op==="engage");
                    if(op==="engage" && typeof e.entity.setTarget==="function") e.entity.setTarget(reviewOptions.mode==="duel"?review.player():actors[0].entity);
                });
            } else if(op==="wall") sWall("minecraft:stone");
            else if(op==="clear-wall") sWall("minecraft:air");
            else if(op==="water") stage.fill([5,-1,-4],[11,0,4],"minecraft:water");
            else if(op==="dry") { stage.fill([5,0,-4],[11,0,4],"minecraft:air"); stage.fill([5,-1,-4],[11,-1,4],"minecraft:stone"); }
        } else if (input.op === "condition") {
            var name=String(input.condition);
            if (name === "day" || name === "night") stage.time(name);
            else if (name === "rain" || name === "clear") stage.weather(name);
            else if (name === "heal") actors.forEach(function (entry) {
                if (!entry.entity.isAlive()) return;
                review.heal(entry.entity);
            });
            else if (name === "hurt") actors.forEach(function (entry) { if (entry.entity.isAlive()) entry.entity.setHealth(Math.max(1,entry.entity.getMaxHealth()*.3)); });
            else if (name === "clear-effects") actors.forEach(function (entry) { entry.entity.removeAllEffects(); });
            else if (name.indexOf("effect:")===0) {
                var id=name.slice(7), n=Number(input.actor||0), entity=actors[n] && actors[n].entity;
                if (entity && /^[a-z0-9_:./-]+$/.test(id)) server.runCommandSilent("effect give "+uuidOf(entity)+" "+id+" 30 0");
            }
            out("note", {text:"Reviewer condition: "+name});
        }
    }
    function sWall(block: string): void { stage.fill([-3,0,-4],[3,3,-4],block); }
    function reviewReplacement(): any {
        if (!review || review.freePlay() || reviewTarget || reviewOptions.variant === "authored") return null;
        reviewTarget=true;
        if (reviewOptions.variant === "player") return review.player();
        if (reviewOptions.variant === "pokemon") {
            var Properties=Java.loadClass("com.cobblemon.mod.common.api.pokemon.PokemonProperties"), Entity=Java.loadClass("com.cobblemon.mod.common.entity.pokemon.PokemonEntity"), Entities=Java.loadClass("com.cobblemon.mod.common.CobblemonEntities");
            return new Entity(level,Properties.Companion.parse("blissey level=50", " ", "=").create(),Entities.POKEMON);
        }
        var Registries=Java.loadClass("net.minecraft.core.registries.BuiltInRegistries"), Location=Java.loadClass("net.minecraft.resources.ResourceLocation");
        return Registries.ENTITY_TYPE.get(Location.parse("minecraft:iron_golem")).create(level);
    }

    WorldCombat.on("world_combat:smoke/committed", "world_combat:committed", "", function (event) {
        var action = event.action(); if (!action || review && !owner(refOf(event.actor()))) return;
        var k = String(action.content()) + " " + refOf(event.actor()); casts[k] = (casts[k] || 0) + 1;
        out("cast", { content: String(action.content()), actor: nameOf(event.actor()), target: nameOf(event.target()) });
    });
    WorldCombat.on("world_combat:smoke/damage", "world_combat:damage_applied", "", function (event) {
        var data = JSON.parse(String(event.data())), target = event.target(); if (!target) return;
        var to = owner(refOf(target)), by = owner(refOf(event.actor()));
        if (review && !to && !by) return;
        var actual = data.actual; if (typeof actual !== "number" || !isFinite(actual)) return;
        if (to) damageIn[to.ref] = (damageIn[to.ref] || 0) + actual;
        if (by) damageOut[by.ref] = (damageOut[by.ref] || 0) + actual;
        var fromRef = by ? by.ref : event.actor() ? refOf(event.actor()) : "", toRef = to ? to.ref : refOf(target), critical = data.critical === true;
        receipts.push({ at: [Number(data.x) || 0, Number(data.y) || 0, Number(data.z) || 0], amount: actual, critical: critical,
            fromRef: fromRef, toRef: toRef, from: nameOf(event.actor()), to: nameOf(target), cause: String(data.cause === undefined ? "" : data.cause) });
        if (fromRef) { hitsOut[fromRef] = (hitsOut[fromRef] || 0) + 1; if (critical) criticalsOut[fromRef] = (criticalsOut[fromRef] || 0) + 1; }
        if (toRef) hitsIn[toRef] = (hitsIn[toRef] || 0) + 1;
        out("damage", { amount: actual, cause: data.cause, from: nameOf(event.actor()), to: nameOf(target) });
    });
    WorldCombat.on("world_combat:smoke/effect", "world_combat:mob_effect_added", "", function (event) {
        var data = JSON.parse(String(event.data())), target = event.target() || event.actor(), holder = owner(refOf(target));
        if (review && !holder) return;
        if (holder) {
            effectsSeen[holder.ref + " " + data.id] = true;
            activeEffects(holder.entity).forEach(function (effect) { if (effect.id === String(data.id)) effect.tags.forEach(function (tag) { effectsSeen[holder!.ref + " " + tag] = true; }); });
        }
        out("mob-effect", { id: data.id, duration: data.duration, on: nameOf(target) });
    });
    WorldCombat.on("world_combat:smoke/died", "world_combat:body_died", "", function (event) { out("died", { who: nameOf(event.actor()) }); });

    ServerEvents.tick(function (event: any) {
        server = event.server; tickNow = Math.floor(Number(server.getTickCount()));
        if (review) {
            level=server.overworld();
            while (reviewRequests.length) { try { reviewRequest(reviewRequests.shift()); } catch(error) { out("fail",{label:"Review setup: "+error}); finished=true; } }
            if (index < 0) return;
        }
        if (stopped) return;
        if (finished && !review) {
            // The finished scenario's entities keep fighting in their own arena; the next one starts elsewhere.
            if (index + 1 < queue.length) advance();
            return;
        }
        if (index < 0) {
            if (!queue.length) { server.runCommandSilent("say no smoke scenario registered"); console.info("SMOKE_VERDICT FAIL - 1/0"); stopped = true; console.info("SMOKE_ALL_DONE 0"); server.runCommandSilent("stop"); return; }
            advance();
        }
        if (startedAt < 0) {
            startedAt = tickNow; level = server.overworld();
            server.runCommandSilent("forceload add " + (centre[0] - 48) + " " + (centre[2] - 48) + " " + (centre[0] + 48) + " " + (centre[2] + 48));
            server.runCommandSilent("gamerule doMobSpawning false"); server.runCommandSilent("gamerule doDaylightCycle false"); server.runCommandSilent("gamerule doWeatherCycle false");
            server.runCommandSilent("weather clear"); server.runCommandSilent("time set day");
            return;
        }
        // A fresh arena's chunks need a moment to load after forceload; pave once they are there, then build the scene.
        if (tickNow === startedAt + 20) {
            server.runCommandSilent("fill " + (centre[0] - 24) + " " + (centre[1] - 1) + " " + (centre[2] - 24) + " " + (centre[0] + 24) + " " + (centre[1] - 1) + " " + (centre[2] + 24) + " minecraft:stone");
            server.runCommandSilent("fill " + (centre[0] - 24) + " " + centre[1] + " " + (centre[2] - 24) + " " + (centre[0] + 24) + " " + (centre[1] + 6) + " " + (centre[2] + 24) + " minecraft:air");
            return;
        }
        if (tickNow === startedAt + (review ? 24 : 60)) {
            if (!builder) { fail("no scenario registered"); finish(); return; }
            out("start", { scenario: scenarioId, centre: centre });
            try { builder(stage); } catch (error) { fail("scenario setup threw: " + error); finish(); return; }
            if (review && review.freePlay()) { finished=true; return; }
            if (!timers.length && !polls.length) finish();
            return;
        }
        if (tickNow < startedAt + (review ? 24 : 60)) return;
        for (var i = 0; i < actors.length; i++) {
            var e = actors[i]; if (!e.entity.isAlive()) continue;
            var v = e.entity.position(), xyz = [Number(v.x()),Number(v.y()),Number(v.z())], d = Math.sqrt(Math.pow(xyz[0] - e.lastAt[0], 2) + Math.pow(xyz[2] - e.lastAt[2], 2));
            e.travelled += d; e.lastAt = xyz;
        }
        if ((tickNow - startedAt) % 20 === 0) out("state", { actors: actors.map(function (e) { return { name: e.name, ref:e.ref, health: e.entity.isAlive() ? e.entity.getHealth() : 0, maxHealth:e.entity.getMaxHealth(), damage:damageIn[e.ref]||0, dealt:damageOut[e.ref]||0, effects:activeEffects(e.entity), at: e.lastAt.map(function (n) { return Math.round(n * 10) / 10; }) }; }) });
        if (finished) return;
        try {
            for (var t = timers.length - 1; t >= 0; t--) if (timers[t].at <= tickNow) { var run = timers.splice(t, 1)[0].run; run(); }
            for (var p = polls.length - 1; p >= 0; p--) {
                var poll = polls[p];
                if (poll.check()) { polls.splice(p, 1); poll.run(); }
                else if (poll.limit <= tickNow) { polls.splice(p, 1); fail("timed out: " + poll.label); }
            }
        } catch (error) { fail("scenario step threw: " + error); finish(); return; }
        if (!finished && !timers.length && !polls.length) finish();
        if (!finished && !(review && review.manual()) && tickNow - startedAt > 12000) { fail("scenario exceeded 10 minutes"); finish(); }
    });
}
