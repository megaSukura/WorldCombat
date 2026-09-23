/**
 * 复生祈祷 / revivalblessing 的出手方式与倒下记录。
 *
 * 核心念头：为倒下的伙伴以慈爱之心祈祷——光从地面升起，照在它倒下的地方，同时给自己与身边的伙伴挂上慈爱祝福。
 *   这一族里其余三招都在「离开」，只有复生祈祷是**把已经失去的拉回来**。
 *
 * 两幕：
 *   起（kneel，提交前）：低头合掌，脚边聚起暖光，只播预告。
 *   祷（beacon → bless，提交后）：在最近倒下的同阵营伙伴处立起 `beams` 束祈祷光柱、飘下 `motes` 点光，
 *     施法者与 `prayerRange` 内每个友善伙伴获得共享身份 `world_combat:status/revival_blessing`；记录被消耗，
 *     不重复为同一次倒下祈祷。附近没有倒在窗口内的伙伴时祈祷落空（none）。
 *
 * **真正的「让昏厥的后备宝可梦以半血复活」需要共享层提供复活／入场操作；本单元交付可观察到的祈祷、光柱、
 *   慈爱祝福与倒下记录，复活部分标为待前置（见报告共享前置）。**
 * 提交前只观察、只 present；世界写入都在提交后。
 */
namespace PokemonSkills {
    interface RevivalFallen { tick: number; x: number; y: number; z: number; owner: string; team: string; species: string; }
    interface RevivalIdentity { owner: string; team: string; species: string; }
    var revivalblessingFallen: RevivalFallen[] = [];
    // 致命一击结算时目标可能已不再 `valid`，所以阵营身份在 still-alive 的 incoming 事件里先记下。
    var revivalblessingIdentity: { [ref: string]: RevivalIdentity } = Object.create(null);

    function revivalblessingTeam(world: CombatWorld, actor: CombatActor): string {
        const entity = world.nativeEntity(actor);
        if (entity === null || typeof entity.getTeam !== "function") return "";
        const team = entity.getTeam();
        return team === null || team === undefined ? "" : String(team.getName());
    }

    function revivalblessingOwner(actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon") return "";
        try { return String(CobblemonCombat.pokemon(actor).owner()); } catch (error) { return ""; }
    }

    function revivalblessingSpecies(actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon") return "";
        try { return String(CobblemonCombat.pokemon(actor).species()); } catch (error) { return ""; }
    }

    /** 距离施法者 `range` 内、窗口内、且与施法者同阵营（同队伍或同主人）的最近一次倒下记录。 */
    export function revivalblessingFind(world: CombatWorld, actor: CombatActor, range: number, window: number): RevivalFallen | null {
        const body = world.observe(actor);
        if (body === null) return null;
        const at = body.position();
        const team = revivalblessingTeam(world, actor), owner = revivalblessingOwner(actor);
        const now = world.tick();
        let best: RevivalFallen | null = null, bestDistance = 0;
        for (let index = revivalblessingFallen.length - 1; index >= 0; index--) {
            const entry = revivalblessingFallen[index];
            if (now - entry.tick > window) continue;
            const dx = entry.x - at.x(), dy = entry.y - at.y(), dz = entry.z - at.z();
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance > range) continue;
            const allied = (entry.team !== "" && entry.team === team) || (entry.owner !== "" && entry.owner === owner);
            if (!allied) continue;
            if (best === null || distance < bestDistance) { best = entry; bestDistance = distance; }
        }
        return best;
    }

    /** 坐标口径的快速判断，供 AI 在决策帧里免去世界句柄；阵营校验仍由 `ready` 负责。 */
    export function revivalblessingNear(point: number[], range: number, tick: number, window: number): boolean {
        for (let index = revivalblessingFallen.length - 1; index >= 0; index--) {
            const entry = revivalblessingFallen[index];
            if (tick - entry.tick > window) continue;
            const dx = entry.x - point[0], dy = entry.y - point[1], dz = entry.z - point[2];
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= range) return true;
        }
        return false;
    }

    function revivalblessingIdentityOf(world: CombatWorld, actor: CombatActor): RevivalIdentity {
        return { owner: revivalblessingOwner(actor), team: revivalblessingTeam(world, actor), species: revivalblessingSpecies(actor) };
    }

    // 倒下记录：任何战斗者被打死（after ≤ 0）时记下位置与阵营，供同阵营的施法者祈祷。
    WorldCombat.on("world_combat:move_revivalblessing/incoming", "world_combat:damage_incoming", "", function (event) {
        const victim = event.target();
        if (victim === null) return;
        const world = event.world();
        if (!world.valid(victim)) return;
        const ref = String(victim.ref());
        revivalblessingIdentity[ref] = revivalblessingIdentityOf(world, victim);
        if (Object.keys(revivalblessingIdentity).length > 64) revivalblessingIdentity = Object.create(null);
    });
    WorldCombat.on("world_combat:move_revivalblessing/fallen", "world_combat:damage_applied", "", function (event) {
        const victim = event.target();
        if (victim === null) return;
        const world = event.world();
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || !(data.after <= 0)) return;
        let x = Number(data.x), y = Number(data.y), z = Number(data.z);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            const body = world.observe(victim);
            if (body === null) return;
            const at = body.position(); x = at.x(); y = at.y(); z = at.z();
        }
        const identity = revivalblessingIdentity[String(victim.ref())] || { owner: "", team: "", species: "" };
        revivalblessingFallen.push({ tick: world.tick(), x: x, y: y, z: z,
            owner: identity.owner, team: identity.team, species: identity.species });
        if (revivalblessingFallen.length > 48) revivalblessingFallen.shift();
    });

    define({
        id: revivalblessingId,
        cooldownParameter: "recharge",
        name: "Revival Blessing",
        description: "回应附近同伴倒下的位置，为自己队伍中一只昏厥的宝可梦恢复一半生命；复苏的伙伴留在后备，不会立即上场。",
        uses: ["在伙伴倒下后祈祷，让队伍里昏厥的伙伴恢复一半生命", "给身边存活的伙伴挂上慈爱祝福", "用一次祈祷记住倒下的位置"],
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
            const context: NumberContext = { pokemon: pokemon!, skill: skills[revivalblessingId], detail: { values: config } };
            return {
                radius: p(revivalblessingId, "prayerRange", context), geometry: "circle", style: "prayer", color: 0xFFF2B0,
                label: config && config.vigil ? "复生祈祷·守夜" : "复生祈祷"
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
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor();
            if (world.observe(actor) === null) return "invalid-target";
            const range = p(revivalblessingId, "prayerRange", action);
            return revivalblessingFind(world, actor, range, revivalblessingWindow) === null ? "no-fallen" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_revivalblessing:kneel", revivalblessingScene, 1, action.origin(),
                JSON.stringify({ moment: "kneel", vigil: config && config.vigil ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const range = p(revivalblessingId, "prayerRange", action);
            const beacon = Math.max(60, Math.round(p(revivalblessingId, "beaconTicks", action)));
            const bless = Math.max(60, Math.round(p(revivalblessingId, "blessTicks", action)));
            const beams = Math.max(3, Math.round(p(revivalblessingId, "beams", action)));
            const motes = Math.max(8, Math.round(p(revivalblessingId, "motes", action)));
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));
            const found = revivalblessingFind(world, self, range, revivalblessingWindow);
            if (found === null) {
                WorldFeedback.emit(world, revivalblessingScene, 1, origin, { moment: "none", scale: scale }, 20);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), revivalblessingNoneText, [], 24);
                world.sound("minecraft:block.beacon.deactivate", origin, 12, "{}");
                done(action); return;
            }
            const index = revivalblessingFallen.indexOf(found);
            if (index >= 0) revivalblessingFallen.splice(index, 1);
            const spot = WorldCombat.point(found.x, found.y, found.z);
            WorldFeedback.emit(world, revivalblessingScene, 1, spot,
                { moment: "beacon", beams: beams, motes: motes, species: found.species, scale: scale }, beacon);
            world.sound("minecraft:block.beacon.activate", spot, 16, "{}");
            // 真实的复苏：队伍里若有同队昏厥的伙伴，按本招的复活比例恢复它的真实生命。
            // 只认施法者自己队伍里的成员，野生个体、普通生物或队里没有昏厥者时，祈祷只落在倒下位置。
            const fainted = partyFainted(partyRoster(world, self), found.species);
            const revived = fainted !== null && partyRevive(world, self, fainted.slot, p(revivalblessingId, "reviveRatio", action)).ok;
            WorldFeedback.text(world, spot.plus(WorldCombat.point(0, 1.6, 0)),
                revived ? revivalblessingReviveText : revivalblessingText, [found.species], 40);

            MobEffects.apply(world, self, revivalblessingEffect, bless, 0);
            const near = world.query(origin, range, false);
            let anointed = 0;
            for (let index2 = 0; index2 < near.length; index2++) {
                const other = near[index2];
                if (String(other.ref()) === String(self.ref()) || !world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                if (MobEffects.apply(world, other, revivalblessingEffect, bless, 0) === null) continue;
                anointed++;
                WorldFeedback.emit(world, revivalblessingScene, 1, facts.position(),
                    { moment: "anoint", target: String(other.ref()), motes: motes, scale: scale }, 22);
            }
            WorldFeedback.emit(world, revivalblessingScene, 1, origin,
                { moment: "pray", beams: beams, anointed: anointed, motes: motes, scale: scale }, 30);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), revivalblessingAnointText, [anointed], 30);
            done(action);
        }
    });
}
