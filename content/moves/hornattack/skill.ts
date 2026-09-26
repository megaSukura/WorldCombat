/**
 * 角撞 / hornattack 的出手方式。
 *
 * 核心念头：**低头扎进对手、把角锁在伤口上，用整个身体把对方沿地面一路顶出去**——不是一记击退，
 * 而是一段持续的地面推移，把目标从站位上推走。它是本组唯一的「顶住推走」。
 *
 * 三幕：
 *   起（brace，提交前）：低头、后腿蹬地、角尖压低，只播预告。
 *   顶（gore → impact，提交后）：先做一次**原生短接触**（moveSweep）——身体朝 `heading` 趟出 `rush` 格，
 *       停在第一个实体或障碍上；只有真的接触到非友方才结算一次 `gore` 接触伤害。撞墙或空趟就收角，不越墙找原目标。
 *   推（push，可续几刻）：角不松，**先把目标沿地面推一步**，再按目标实际被推动的位移把本体跟进同样距离；
 *       目标被拒、撞墙或推不动（实际位移≈0）就立刻松角——绝不空推让本体穿过目标。只此一次初伤，推行过程不追加伤害。
 *
 * 选取：`kind: "aim"`——可点任意阵营实体或一个世界点；首敌由原生接触建立，命中权限仍由命中层判断。
 *
 * 与同族分开：超级角击是长蓄势、单点窄线的重刺（会钉住或挑飞）；头锤扑上去撞出畏缩；撞击从身侧滑过换位；
 * 角撞凭「锁住、贴着地面把目标一路推走」认出来。
 *
 * 配置 `drive` 由公式改威力、顶走距离与初始顶退，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hornattackScene = "world_combat:move_hornattack";
    const hornattackHitText = "world_combat.move.hornattack.text.hit";
    const hornattackPushText = "world_combat.move.hornattack.text.push";
    const hornattackMissText = "world_combat.move.hornattack.text.miss";
    const hornattackMinimum = 0.02;

    /** 把瞄准方向压平成一个水平单位向量。 */
    function hornattackHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    function hornattackCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        freeMovement: true,
        id: "hornattack",
        cooldownParameter: "recharge",
        name: "Horn Attack",
        description: "低头扎进对手、把角锁在伤口上，用整个身体把对方沿地面一路顶出去：先做一次原生短接触锁定首敌、只结算一次初伤，随后先把目标推走、再按它实际被推动的距离跟进本体；目标被拒或撞墙就立即松角。它是全组唯一「顶住推走」的一记，体重越重顶得越远。",
        uses: ["低头一记原生接触顶中贴身目标", "把对手沿地面一路推离掩体或站位", "低消耗的近身压制"],
        kind: "aim",
        range: 1.9,
        maxRange: 2.8,
        prepare: 7,
        active: 20,
        recover: 7,
        cooldown: 16,
        maximumTicks: 220,
        style: "stab",
        defaults: { drive: false, ai: { maxChase: 6, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hornattack", "reach", pokemon), geometry: "line", style: "stab", color: 0xC9A06A,
                label: config && config.drive === true ? "推土式" : "角撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["hornattack"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("hornattack", "tempo", context)),
                recover: Math.round(p("hornattack", "aftercast", context)),
                cooldown: Math.round(p("hornattack", "recharge", context)),
                active: skills["hornattack"].active,
                range: p("hornattack", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_hornattack:brace", hornattackScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", windup: prepare, drive: config && config.drive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(hornattackScene);
            const world = action.world();
            const actor = action.actor();
            const heading = hornattackHeading(aim(action));
            const horn = Math.max(0.26, p("hornattack", "horn", action));
            const rush = Math.max(0, p("hornattack", "rush", action));
            const shove = Math.max(0, p("hornattack", "shove", action));
            const carry = Math.max(0, p("hornattack", "carry", action));
            const carrySpeed = Math.max(0.05, p("hornattack", "carrySpeed", action));
            const power = p("hornattack", "gore", action);
            const dust = Math.max(8, Math.round(p("hornattack", "dust", action)));
            const scale = Math.max(0.6, Math.min(1.8, horn / 0.34));
            const intensity = Math.max(0.6, Math.min(2.0, power / 62));
            const direction = [heading.x(), heading.y(), heading.z()];

            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const start = self.position();

            sound(action, "minecraft:entity.hoglin.angry");
            // 原生短接触选首敌：身体沿 heading 趟出 rush 格，停在第一个实体或障碍，不越过墙去找原目标。
            const swept = sweepStep(action, heading.scale(rush), horn);
            const contact = swept.hit;
            const afterBody = world.observe(actor);
            const origin = afterBody === null ? start : afterBody.position();
            const path = [hornattackCoords(start), hornattackCoords(origin)];
            const victim = contact.hitEntity() ? contact.target() : null;

            if (victim === null) {
                const wall = contact.blockPosition();
                const stop = wall !== null ? wall : (contact.blocked() ? contact.position() : origin);
                WorldFeedback.emit(world, hornattackScene, 1, stop,
                    { moment: "miss", path: path, dust: Math.round(dust * 0.6), scale: scale }, 18);
                WorldFeedback.text(world, stop.plus(WorldCombat.point(0, 1.0, 0)), hornattackMissText, [], 20);
                done(action);
                return;
            }

            const foe = world.observe(victim);
            if (foe === null) { done(action); return; }
            const foeActor: CombatActor = victim;

            WorldFeedback.emit(world, hornattackScene, 1, contact.position(),
                { moment: "gore", path: path, direction: direction, dust: dust, scale: scale, intensity: intensity }, 18);
            if (!hurt(action, victim, "hornattack", power, { damage: damageSpec("hornattack", "gore"), contact: true })) { done(action); return; }

            sound(action, "cobblemon:impact.normal");
            const contactBody = world.observe(victim);
            const contactPoint = contactBody === null ? contact.position() : contactBody.position();
            WorldFeedback.emit(world, hornattackScene, 1, contactPoint,
                { moment: "impact", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 20);
            WorldFeedback.text(world, contactPoint.plus(WorldCombat.point(0, 1.1, 0)), hornattackHitText, [], 20);

            // 初始顶退也按实际位移跟进：先动目标、再动本体。
            const shoved = world.valid(victim) ? world.displace(victim, heading.scale(shove)) : 0;
            let carried = shoved;
            if (shoved > hornattackMinimum && world.valid(actor)) world.displace(actor, heading.scale(shoved));
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? origin : body.position();
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), hornattackPushText, [Math.round(carried * 10) / 10], 24);
                scenes.finish(current, done);
            }

            function push(current: CombatAction, remaining: number): void {
                const scope = current.world();
                if (!scope.valid(foeActor) || remaining <= hornattackMinimum || carried >= carry) { finish(current); return; }
                const step = Math.min(carrySpeed, remaining);
                const back = heading.scale(step);
                // 先把目标推一步；推不动（被拒/撞墙/抗性）就立即收角，绝不空推穿过目标。
                const targetMoved = scope.displace(foeActor, back);
                if (targetMoved < hornattackMinimum) { finish(current); return; }
                carried += targetMoved;
                const followed = scope.valid(actor) ? scope.displace(actor, heading.scale(targetMoved)) : 0;
                // 本体被挡、跟不上目标的实际位移就松角，不让角与被顶目标脱开。
                if (followed < targetMoved - 0.05) { finish(current); return; }
                const foeBody = scope.observe(foeActor);
                if (foeBody !== null) scenes.show(current, "pushFoe", foeBody.position(),
                    { moment: "push", target: String(foeActor.ref()), dust: Math.round(dust * 0.7), scale: scale, intensity: intensity,
                        moved: Math.round(targetMoved * 100) / 100 });
                const selfBody = scope.observe(actor);
                if (selfBody !== null) scenes.show(current, "pushBody", selfBody.position(),
                    { moment: "push", dust: Math.round(dust * 0.7), scale: scale, intensity: intensity,
                        moved: Math.round(followed * 100) / 100 });
                if (remaining - step <= hornattackMinimum || carried >= carry) { finish(current); return; }
                current.after(1, function (next: CombatAction) { push(next, remaining - step); });
            }

            push(action, carry);
        }
    });
}
