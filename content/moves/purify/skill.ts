/**
 * 净化 / Purify —— 执行组织。
 *
 * 核心念头：朝瞄准处探出手——直接点到谁就抽谁，点向空处则在落点小范围内挑最近的一个带异常者——把它身上的病痛
 *   整项抽出来；暗雾沿一条线飞回施法者，落地化成生命。它是一个**单点的转化**：净化的是别人（伙伴或对手都行），回血的是自己。
 *
 * 两幕：
 *   起（windup，提交前）：手心拢起一点净光，并预告这次会抽到谁，可被打断。
 *   引（提交后）：**精确实体优先**——直接瞄准某个战斗者就用它；点向地面才在落点 captureRadius 内取最近的带异常者。
 *     把它身上的全部有害状态效果抽走；真正抽到东西后，施法者才按**目标最大生命**的 heal 比例回复。
 *     瞄准的实体在这段准备里已经干净、或落点附近没有带异常的目标，整招落空（不抽、不回血）。
 *
 * 反制：必须先有目标带异常才有收益；落空就白费一次出手。给对手回血的风险与抽走病痛的收益同时存在，
 *   这是它和其他净化招最大的不同——它治的是「别人」，拿到的是「自己」。
 * 宝可梦层：抽走的是共享默认效果，原生队伍面板随之同步；本招不新增状态。
 */
namespace PokemonSkills {
    function purifyAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 落点 `radius` 内最近的、未被排除的、带有害状态效果的战斗者；没有就返回 null。 */
    function purifyFind(world: CombatWorld, point: CombatPoint, radius: number, self: CombatActor | null): CombatActor | null {
        const near = world.query(point, Math.max(0.5, radius), false);
        let best: CombatActor | null = null, bestDistance = 0;
        for (let index = 0; index < near.length; index++) {
            const candidate = near[index];
            if (self !== null && String(candidate.ref()) === String(self.ref())) continue;
            const body = world.observe(candidate);
            if (body === null || body.health() <= 0) continue;
            if (!CombatStatus.hasHarmful(world, candidate)) continue;
            const distance = body.position().minus(point).length();
            if (best === null || distance < bestDistance) { best = candidate; bestDistance = distance; }
        }
        return best;
    }

    /**
     * 本次瞄准真正会抽取的对象：直接瞄准的实体积优先（任何阵营，只要带着异常且不是自己）；
     * 只瞄到地面时才退回「落点 captureRadius 内最近的带异常者」。返回 null 表示这一手会落空。
     */
    function purifyIntended(world: CombatWorld, action: CombatAction, self: CombatActor, radius: number): CombatActor | null {
        const aimed = action.target();
        if (aimed !== null && world.valid(aimed)) {
            if (String(aimed.ref()) === String(self.ref())) return null;
            const body = world.observe(aimed);
            if (body === null || body.health() <= 0) return null;
            return CombatStatus.hasHarmful(world, aimed) ? aimed : null;
        }
        return purifyFind(world, action.targetPosition(), radius, self);
    }

    /** 抽走一个战斗者身上的全部有害状态效果，返回实际抽走的项数。 */
    function purifyDrain(world: CombatWorld, actor: CombatActor): number {
        return CombatStatus.cureHarmful(world, actor);
    }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function purifyHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        const body = world.observe(target);
        if (body === null) return 0;
        const missing = body.maxHealth() - body.health();
        if (missing <= 0 || amount <= 0) return 0;
        let healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            const pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, Math.min(missing, amount) / scale, cause);
        } else {
            healed = world.health(target, Math.min(missing, amount), "world_combat:" + cause);
        }
        const after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    define({
        id: purifyId,
        cooldownParameter: "recharge", name: "净化",
        description: "朝瞄准处探出手：直接点到谁就抽谁，点向地面则在落点小范围内挑最近的带异常者；把它身上的全部有害状态效果一次抽走。只有真正抽到东西，病痛才化作暗雾飞回施法者，施法者按目标最大生命的比例回复。伙伴与对手都能净，但瞄准的对象已经干净、或落点附近没有带异常者时整招落空。",
        uses: ["顺手洗掉伙伴中毒并给自己回一口", "把对手身上的灼伤拿走、换自己的生机", "挑一个高生命的目标抽取，换回更多生机"],
        kind: "aim", range: 4, maxRange: 7, prepare: 10, active: 0, recover: 7, cooldown: 130, style: "purify", maximumTicks: 200,
        defaults: { deep: false },
        fields: [flag("deep", "深引")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[purifyId], detail: { values: config } };
            return { radius: p(purifyId, "captureRadius", context), geometry: "point", style: "purify", color: 0x9CE8C8,
                label: config && config.deep === true ? "净化 · 深引" : "净化" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[purifyId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(purifyId, "tempo", context)),
                recover: Math.round(p(purifyId, "aftercast", context)),
                cooldown: Math.round(p(purifyId, "recharge", context)),
                active: 0, range: p(purifyId, "reach", context)
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), self = action.actor();
            if (world.observe(self) === null) return "invalid-target";
            const radius = Math.max(0.5, p(purifyId, "captureRadius", action));
            return purifyIntended(world, action, self, radius) === null ? "nothing-to-cleanse" : "";
        },
        windup: function (action, _config, prepare) {
            const world = action.sense(), self = action.actor();
            const radius = Math.max(0.5, p(purifyId, "captureRadius", action));
            const motes = Math.max(10, Math.round(p(purifyId, "motes", action)));
            const intended = purifyIntended(world, action, self, radius);
            const data: any = { moment: "windup", motes: motes, preview: 0 };
            if (intended !== null) {
                // 提交前先把这次会抽到谁连出来：精确实体给实体连线，点选给落点连线。
                data.target = String(intended.ref());
                data.preview = 1;
                data.path = [String(self.ref()), String(intended.ref())];
            }
            action.present("purify:windup", purifyScene, 1, action.origin(), JSON.stringify(data));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const radius = Math.max(0.5, p(purifyId, "captureRadius", action));
            const motes = Math.max(10, Math.round(p(purifyId, "motes", action)));
            const target = purifyIntended(world, action, self, radius);
            if (target === null) {
                WorldFeedback.emit(world, purifyScene, 1, body.position(), { moment: "fizzle", target: String(self.ref()) }, 20);
                WorldFeedback.text(world, purifyAbove(body.position()), purifyNoneText, [], 24);
                done(action); return;
            }
            const mate = world.observe(target);
            if (mate === null) { done(action); return; }
            const remote = mate.position();
            const removed = purifyDrain(world, target);
            if (removed <= 0) {
                // 瞄准的实体在这段准备里已经干净：不抽、不回血，只留一下落空。
                WorldFeedback.emit(world, purifyScene, 1, remote, { moment: "fizzle", target: String(self.ref()) }, 20);
                WorldFeedback.text(world, purifyAbove(remote), purifyNoneText, [], 24);
                done(action); return;
            }
            const fraction = Math.max(0, Math.min(1, p(purifyId, "heal", action)));
            const before = body.health();
            const gained = purifyHeal(world, self, mate.maxHealth() * fraction, "purify");
            const scale = Math.max(0.6, Math.min(1.8, radius / 1.3));
            world.sound("minecraft:block.beacon.power_select", remote, 12, "{}");
            WorldFeedback.emit(world, purifyScene, 1, remote,
                { moment: "draw", target: String(target.ref()), path: [String(target.ref()), String(self.ref())],
                    removed: removed, motes: motes, scale: scale }, 28);
            WorldFeedback.text(world, purifyAbove(remote), purifyDrawText, [removed], 26);
            if (gained > 0) {
                // absorb 只在真有回血时出现，强度由实际补回的生命占自身上限的比例驱动。
                const after = world.observe(self), maximum = after === null ? body.maxHealth() : after.maxHealth();
                world.sound("minecraft:entity.experience_orb.pickup", body.position(), 14, "{}");
                WorldFeedback.emit(world, purifyScene, 1, body.position(),
                    { moment: "absorb", target: String(self.ref()), motes: motes, gained: Math.round(gained * 10) / 10,
                        intensity: Math.max(0.6, Math.min(1.8, 0.6 + gained / Math.max(1, maximum) * 2.4)) }, 32);
                WorldFeedback.text(world, purifyAbove(body.position()), purifyAbsorbText, [Math.round(gained * 10) / 10], 28);
            }
            done(action);
        }
    });
}
