/** Revive one exact fainted party individual; a nearby death site is an optional visual clue. */
namespace PokemonSkills {
    interface RevivalFallen { tick: number; x: number; y: number; z: number; id: string; dimension: string; }
    const revivalblessingFallen: RevivalFallen[] = [];
    /** 已登记的死亡编号，用来把同一场死亡从多个观察者去重，只留一份真实倒下点。 */
    const revivalblessingSeen: { [deathId: string]: number } = Object.create(null);
    function revivalblessingDimension(world: CombatWorld): string { return String(world.nativeLevel().dimension().location()); }
    function revivalblessingPrune(now: number): void {
        for (let index = revivalblessingFallen.length - 1; index >= 0; index--) if (now - revivalblessingFallen[index].tick > revivalblessingWindow) revivalblessingFallen.splice(index, 1);
        Object.keys(revivalblessingSeen).forEach(deathId => { if (now - revivalblessingSeen[deathId] > revivalblessingWindow) delete revivalblessingSeen[deathId]; });
    }
    export function revivalblessingFind(world: CombatWorld, actor: CombatActor, id: string, range: number): RevivalFallen | null {
        const body = world.observe(actor); if (!body) return null;
        revivalblessingPrune(world.tick());
        const dimension = revivalblessingDimension(world), keys = [id, "cobblemon:" + id];
        let found: RevivalFallen | null = null, nearest = range;
        revivalblessingFallen.forEach(entry => {
            if (keys.indexOf(entry.id) < 0 || entry.dimension !== dimension) return;
            const distance = WorldCombat.point(entry.x, entry.y, entry.z).minus(body.position()).length();
            if (distance <= nearest) { nearest = distance; found = entry; }
        });
        return found;
    }
    export function revivalblessingMember(world: CombatWorld, actor: CombatActor, _visualRange: number): PartyMember | null {
        const roster = partyRoster(world, actor).filter(member => member.fainted && !member.active && member.state === "inactive");
        return roster.length ? roster[0] : null;
    }
    // 真正倒下的事实：actor_died 的观察者快照直接带真实身份与倒下点，不再自建 incoming→伤害后字典。
    WorldCombat.on("world_combat:move_revivalblessing/fallen", "world_combat:actor_died", "", event => {
        const world = event.world();
        let data: any; try { data = JSON.parse(String(event.data())); } catch (error) { return; }
        if (data.self === true) return;
        const deathId = String(data.deathId || ""); if (!deathId) return;
        revivalblessingPrune(world.tick());
        if (revivalblessingSeen[deathId] !== undefined) return;
        revivalblessingSeen[deathId] = world.tick();
        const position = data.position;
        if (!Array.isArray(position) || position.length !== 3 || !position.every((value: any) => typeof value === "number" && isFinite(value))) return;
        const identity = String(data.identity || ""), dimension = String(data.dimension || "");
        if (!identity || !dimension) return;
        revivalblessingFallen.push({ tick: typeof data.tick === "number" ? data.tick : world.tick(),
            x: Number(position[0]), y: Number(position[1]), z: Number(position[2]), id: identity, dimension: dimension });
    });
    define({
        id: revivalblessingId,
        cooldownParameter: "recharge",
        name: "Revival Blessing",
        description: "为自己队伍中确定的一只昏厥伙伴恢复一半生命；复苏后留在后备，附近存在它的倒下记录时才照亮对应地点。",
        uses: ["在伙伴倒下后祈祷，让队伍里昏厥的伙伴恢复一半生命", "远离倒下地点仍能救队伍后备", "只在成功时照亮对应伙伴的倒下地点"],
        kind: "self",
        range: 6,
        maxRange: 14,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 240,
        style: "prayer",
        defaults: { vigil: false, ai: { combatOnly: false } },
        fields: [flag("vigil", "守夜祷告")],
        indicator: function (config, pokemon) {
            return {
                radius: 0, geometry: "circle", style: "prayer", color: 0xFFF2B0,
                label: "复生祈祷 · 队伍后备"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[revivalblessingId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(revivalblessingId, "tempo", context)),
                recover: Math.round(p(revivalblessingId, "aftercast", context)),
                cooldown: Math.round(p(revivalblessingId, "recharge", context)),
                active: 0,
                range: p(revivalblessingId, "prayerRange", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor(), raw = action.data("world_combat:revivalblessing/member");
            if (raw) {
                const chosen = JSON.parse(raw);
                return partyRoster(world, actor).some(member => member.id === chosen.id && member.slot === chosen.slot && member.fainted && !member.active && member.state === "inactive") ? "" : "member-changed";
            }
            return revivalblessingMember(world, actor, p(revivalblessingId, "prayerRange", action)) ? "" : "no-fainted-member";
        },
        windup: function (action, config, prepare) {
            const member = revivalblessingMember(action.sense(), action.actor(), p(revivalblessingId, "prayerRange", action));
            if (!member) { action.reject("no-fainted-member"); return prepare; }
            action.data("world_combat:revivalblessing/member", JSON.stringify({ id: member.id, slot: member.slot, species: member.species }));
            action.present("world_combat:move_revivalblessing:kneel", revivalblessingScene, 1, action.origin(),
                JSON.stringify({ moment: "kneel", vigil: config && config.vigil ? 1 : 0 }));
            action.present("world_combat:move_revivalblessing:member", "world_combat:feedback", 1, action.origin(), JSON.stringify({
                kind: "world-text", start: action.sense().tick(), duration: prepare + 6, key: "world_combat.move.revivalblessing.text.member", args: [member.slot + 1, member.species]
            }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), raw = action.data("world_combat:revivalblessing/member");
            const chosen = raw && JSON.parse(raw), origin = action.origin();
            const member = chosen && partyRoster(world, self).filter(entry => entry.id === chosen.id && entry.slot === chosen.slot
                && entry.fainted && !entry.active && entry.state === "inactive")[0];
            const revived = member && partyRevive(world, self, member.slot, p(revivalblessingId, "reviveRatio", action), member.id).ok;
            if (!revived) {
                WorldFeedback.emit(world, revivalblessingScene, 1, origin, { moment: "none", scale: 1 }, 20);
                WorldFeedback.text(world, origin, revivalblessingNoneText, [], 24); done(action); return;
            }
            const found = revivalblessingFind(world, self, member.id, p(revivalblessingId, "prayerRange", action));
            const beams = Math.round(p(revivalblessingId, "beams", action)), motes = Math.round(p(revivalblessingId, "motes", action));
            const beaconTicks = Math.max(1, Math.round(p(revivalblessingId, "beaconTicks", action)));
            if (found) {
                revivalblessingFallen.splice(revivalblessingFallen.indexOf(found), 1);
                const spot = WorldCombat.point(found.x, found.y, found.z);
                // 光柱持续与实际 beaconTicks 一致：把真实时长一并交给消费者，柱体按整段时长持续发射。
                WorldFeedback.emit(world, revivalblessingScene, 1, spot,
                    { moment: "beacon", beams: beams, motes: motes, scale: 1, duration: beaconTicks }, beaconTicks);
            }
            WorldFeedback.emit(world, revivalblessingScene, 1, origin, { moment: "pray", beams, motes, scale: 1 }, 30);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), revivalblessingReviveText, [member.species], 40);
            world.sound("minecraft:block.beacon.activate", origin, 16, "{}"); done(action);
        }
    });
}
