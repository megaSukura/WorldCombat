/**
 * 共享队伍接棒：读有序后备队伍、按内容的策略挑一个合法后备，再交给原生换人入口。
 *
 * 事实归事实、玩法归玩法：本文件只把「队伍里有没有可上的后备」「哪一槽」「换人的结果」整理成
 * 内容可直接消费的形态，具体是折返、接棒、断尾、强换还是复生，由各招自己控制。
 * 原生换人对 owner／队伍／个体状态做校验；野生、普通生物或已经没有可上场后备时返回明确的失败原因，
 * 调用方保留自己原有的即时效果，不假装发生过换人。
 */
namespace PokemonSkills {
    export interface PartyMember {
        slot: number;
        id: string;
        species: string;
        level: number;
        health: number;
        maxHealth: number;
        fainted: boolean;
        /** Native storage state name, e.g. inactive / sent-out / shouldered. */
        state: string;
        active: boolean;
    }
    export interface PartyRelayResult {
        ok: boolean;
        reason: string;
        /** Actor ref of the sent-out individual on success; empty otherwise. */
        ref: string;
        /** False only when a refused send-out also failed to put the caster back. */
        restored: boolean;
    }

    /** Ordered read-only owner party; [] for a wild actor, a non-Pokemon or a stale owner. */
    export function partyRoster(world: CombatWorld, actor: CombatActor): PartyMember[] {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return [];
        var json = "";
        try { json = String(CobblemonCombat.party(world, actor)); } catch (error) { return []; }
        var roster: PartyMember[];
        try { roster = JSON.parse(json); } catch (error) { return []; }
        return roster && roster.length ? roster : [];
    }

    /** The acting individual's own party id, so a reserve never picks the member already on the field. */
    export function partyActiveId(world: CombatWorld, actor: CombatActor): string {
        try { return String(CobblemonCombat.pokemon(actor).id()); } catch (error) { return ""; }
    }

    /** Feet-centre point for a body observation: native send-out points start at the feet, not the body centre. */
    export function partyFeet(body: CombatObservation): CombatPoint {
        return WorldCombat.point(body.position().x(), body.position().y() - body.height() / 2, body.position().z());
    }

    /**
     * First legal reserve: an inactive, non-fainted member that is not the acting individual.
     * A `prefer` slot is honoured only when that slot is legal, so preferences never override legality.
     * An optional `activeId` skips the member currently on the field.
     */
    export function partyReserve(roster: PartyMember[], activeId?: string, prefer?: number): PartyMember | null {
        var fallback: PartyMember | null = null;
        for (var index = 0; index < roster.length; index++) {
            var member = roster[index];
            if (member.fainted || member.active || String(member.state) !== "inactive") continue;
            if (activeId && String(member.id) === String(activeId)) continue;
            if (prefer !== undefined && Number(member.slot) === Number(prefer)) return member;
            if (fallback === null) fallback = member;
        }
        return fallback;
    }

    /** Owner's fainted party member; a matching species wins when given, otherwise the lowest slot. */
    export function partyFainted(roster: PartyMember[], species?: string): PartyMember | null {
        var fallback: PartyMember | null = null;
        for (var index = 0; index < roster.length; index++) {
            var member = roster[index];
            if (!member.fainted) continue;
            if (species && String(member.species) === String(species)) return member;
            if (fallback === null) fallback = member;
        }
        return fallback;
    }

    /** Recall the acting individual and send party `slot` out at `point` (null keeps its position); {ok,reason,ref,restored}. */
    export function partySwitchOut(world: CombatWorld, actor: CombatActor, slot: number, point: CombatPoint | null): PartyRelayResult {
        try { return partyReceipt(String(CobblemonCombat.switchOut(world, actor, slot, point))); }
        catch (error) { return { ok: false, reason: "unavailable", ref: "", restored: false }; }
    }

    /** Send the owner's party `slot` out without recalling anyone (used to stage a hand-off before a recall). */
    export function partySendOut(world: CombatWorld, actor: CombatActor, slot: number, point: CombatPoint | null): PartyRelayResult {
        try { return partyReceipt(String(CobblemonCombat.sendOut(world, actor, slot, point))); }
        catch (error) { return { ok: false, reason: "unavailable", ref: "", restored: false }; }
    }

    /** Native recall of the sent-out individual behind `actor`; false keeps it unchanged. */
    export function partyRecall(world: CombatWorld, actor: CombatActor): boolean {
        try { return CobblemonCombat.recall(world, actor); } catch (error) { return false; }
    }

    /**
     * Force a switch on a target that has its own legal reserve: recall it and send the next member out at `point`.
     * Wild individuals, plain mobs and owners with no reserve return null and are left untouched, so the caller keeps
     * whatever immediate effect it already applied.
     */
    export function partyForceOut(world: CombatWorld, target: CombatActor, point: CombatPoint): PartyMember | null {
        const reserve = partyReserve(partyRoster(world, target), partyActiveId(world, target));
        if (reserve === null) return null;
        const result = partySwitchOut(world, target, reserve.slot, point);
        return result.ok ? reserve : null;
    }

    /** Restore a fainted party member behind `actor` to `ratio` of maximum HP; a separate step from send-out. */
    export function partyRevive(world: CombatWorld, actor: CombatActor, slot: number, ratio: number, expectedId?: string): PartyRelayResult {
        try { return partyReceipt(String(expectedId === undefined ? CobblemonCombat.reviveResult(world, actor, slot, ratio)
            : CobblemonCombat.reviveResult(world, actor, slot, ratio, expectedId))); }
        catch (error) { return { ok: false, reason: "unavailable", ref: "", restored: false }; }
    }

    /** Native receipts share a shape; a malformed reply is reported instead of thrown so callers can fall back. */
    function partyReceipt(json: string): PartyRelayResult {
        try {
            var value = JSON.parse(json);
            return { ok: value.ok === true, reason: String(value.reason || ""), ref: String(value.ref || ""), restored: value.restored !== false };
        } catch (error) { return { ok: false, reason: "unavailable", ref: "", restored: false }; }
    }
}
