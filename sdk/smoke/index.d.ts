/**
 * Smoke scenarios: a unit's own executable design note, run on a hidden headless server by `node tools/smoke-unit.mjs <unit>`.
 *
 * A scenario stages a small arena (who stands where, with which moves, in what weather, on what ground), lets the AI
 * fight for a while, then states the few facts that must hold whenever this move works at all. Everything with a
 * chance in it (hits, crits, secondary effects) belongs in `note(...)`, which lands in the trace for the author to read.
 */
declare namespace Smoke {
    interface Actor {
        /** Actor reference prefix (`<uuid>/`); every WorldCombat event about this entity starts with it. */
        readonly ref: string;
        readonly name: string;
        /** Current health or 0 once gone. */
        health(): number;
        /** Current position as [x, y, z]. */
        position(): number[];
        alive(): boolean;
    }
    interface PokemonSpec {
        species: string;
        level?: number;
        /** Move ids in slot order; slot 0 first. Omitted slots stay empty so the AI has only these to choose from. */
        moves: string[];
        /** Offset from the arena centre. */
        at: number[];
        /** Cobblemon status id such as "sleep", "burn", "paralysis". */
        status?: string;
        /** Ability id; defaults to the species' first ability. */
        ability?: string;
        /** Held item id. */
        item?: string;
        /** Extra `PokemonProperties` text (nature=, gender=, shiny=...). */
        properties?: string;
    }
    interface MobSpec { type: string; at: number[]; }
    interface Stage {
        /** Spawns a wild pokemon under WorldCombat AI. */
        pokemon(spec: PokemonSpec): Actor;
        /** Spawns a vanilla mob (a zombie makes a plain punching bag). */
        mob(spec: MobSpec): Actor;
        /** Both actors treat each other as the enemy from now on. */
        hostile(a: Actor, b: Actor): void;
        /** Puts actors on one scoreboard team; the world treats team mates as friendly (allies, owners are not needed). */
        team(name: string, members: Actor[]): void;
        /** Places a block at an arena offset, e.g. "minecraft:short_grass", "minecraft:water", "minecraft:sand". */
        block(at: number[], id: string): void;
        /** Fills a box (inclusive offsets) with a block. */
        fill(from: number[], to: number[], id: string): void;
        weather(kind: "clear" | "rain" | "thunder"): void;
        time(kind: "day" | "night" | "noon" | "midnight"): void;
        /** Runs a Minecraft command as the server; the arena centre is the command position. */
        command(text: string): void;
        /** Continues the script after `ticks` server ticks. */
        after(ticks: number, run: () => void): void;
        /** Runs `check` every tick until it returns true, then continues; fails the scenario after `limit` ticks. */
        until(limit: number, check: () => boolean, run: () => void, label: string): void;
        /** A fact that must hold; a false value fails the scenario with `label`. */
        expect(condition: boolean, label: string): void;
        /** Author's own observation for the trace; write whatever helps you judge the run. */
        note(text: string, data?: any): void;
        /** Ends the scenario; the verdict is PASS when every expectation held. */
        done(): void;

        /** How many times `actor` committed the action `world_combat:<moveId>` (any actor when omitted). */
        casts(moveId: string, actor?: Actor): number;
        /** Total damage applied to `actor` so far. */
        damageTo(actor: Actor): number;
        /** Total damage dealt by `actor`. */
        damageBy(actor: Actor): number;
        /** Whether a mob effect with this registry id (or carrying this `world_combat:status/<name>` tag) was ever added to `actor`.
         *  The host reports an added effect on the next tick, so wait a tick (or poll with `until`) before asserting. */
        hadMobEffect(actor: Actor, idOrTag: string): boolean;
        /** Whether `actor` currently has the mob effect id or tag. */
        hasMobEffect(actor: Actor, idOrTag: string): boolean;
        /** Distance `actor` has moved since spawn, summed over samples. */
        travelled(actor: Actor): number;
        /** Current value of a Minecraft attribute on `actor`, e.g. "minecraft:generic.attack_damage" (modifiers included). */
        attribute(actor: Actor, id: string): number;
        /** Current server tick. */
        tick(): number;
        /** Blocks at arena offsets whose id changed since the stage was set up or since `watch` recorded them: [{ at, before, after }]. */
        changedBlocks(): { at: number[]; before: string; after: string }[];

        /** Native stat-stage ladder of `actor` as last observed (Pokemon stages or the shared non-Pokemon ladder). */
        stages(actor: Actor): { [stat: string]: number };
        /** Power points left in `actor`'s named move; null when that move is not on it. */
        pp(actor: Actor, moveId: string): number | null;
        /** Native held item id on `actor` (empty string when none). */
        heldItem(actor: Actor): string;
        /** Current damage of the first held durable stack; null for an empty hand or an item without durability. */
        heldDamage(actor: Actor): number | null;
        /** Damage receipts in order, with the settled `amount` (actual HP lost, not the pre-mitigation request); `cause` filters by substring. */
        damageEvents(cause?: string): { at: number[]; amount: number; critical: boolean; from: string; to: string; cause: string }[];
        /** How many damage receipts `actor` caused (received when `incoming` is true). */
        hits(actor: Actor, incoming?: boolean): number;
        /** How many of `actor`'s damage receipts were native critical hits. */
        criticals(actor: Actor): number;
        /** Injects native damage of `damageType` (default "minecraft:generic") into `actor`; the metadata is explicit. */
        hurt(actor: Actor, amount: number, damageType?: string, options?: { source?: Actor; metadata?: { [key: string]: any } }): void;
        /** Places the already-registered field `rule` immediately, using `source` or the first arena actor. */
        field(rule: string, at: number[], ticks: number, radius?: number, data?: any, source?: Actor): void;
        /** Apply setup stage changes immediately through the shared stage mechanism. */
        boost(actor: Actor, values: { [stat: string]: number }): void;
        /** Set equipped move PP through the native Move object. */
        setPp(actor: Actor, moveId: string, value: number): void;
        /** Freezes the named actors in place (native NoAI); use a vanilla mob as the stationary target. */
        noai(...actors: Actor[]): void;
        /** Makes `a` treat `b` as its enemy without changing `b`'s target; `hostile` changes both. */
        provoke(a: Actor, b: Actor): void;
        /** Records a region (inclusive arena offsets) so `changedBlocks` reports blocks a move alters there. */
        watch(from: number[], to: number[]): void;
        /** Current block id at an arena offset. */
        blockAt(at: number[]): string;
        /** Applies a preference patch to `actor`'s named move synchronously in a fresh world scope. */
        prefer(actor: Actor, moveId: string, patch: any): void;
    }
    /** Registers this unit's scenario for `tools/smoke-unit.py`; implemented by content/smoke/runtime.ts. */
    function scenario(id: string, build: (stage: Stage) => void): void;
}
