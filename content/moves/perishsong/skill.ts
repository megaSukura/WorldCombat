/**
 * 灭亡之歌 / perishsong —— 执行组织。
 *
 * 核心念头：当众唱起一首三拍子的歌，把脚下这一圈空气变成一块固定「歌域」；圈内最近的一批活物（连同唱的人自己）
 *   被歌声写进名单，施法者必须留在原地把三拍唱完。每一拍过去，名单上还留在圈里的人就少一档；末拍对仍带着
 *   本曲 carrier 的每个活物（敌我都一样，最后才轮到自己）结算一次有限的固定世界伤害。跑出歌域当场脱出名单，
 *   之后回到圈内也不再进入；取消、换下或死亡会终止整首歌，没有独立倒计时，也没有假造状态能单独致死。
 *
 * 三幕 + 收：
 *   起（windup，提交前）：口边聚起音符预告，可被打断，不花代价。
 *   唱（execute 起）：以施法者真实身体中心为原点固定歌域；把圈内最近的其他活物（最多 11）加上自己挂上
 *       共享身份 world_combat:status/perish_song 的真实 MobEffect 作为本曲 carrier，并把 carrier lease 交给
 *       本次动作——取消、换下、死亡时随动作一起清掉。
 *   数（逐刻推进）：每刻核对名单对象是否已离开歌域或死亡；离开即摘 carrier 并永久脱出。每拍更新一次
 *       固定音符画面（3→2→1）与歌域边缘脉冲；歌域边缘就是解除边界，原点固定不追施法者。
 *   结（末拍）：先快照仍留在歌域里的名单与本次施法者预算，先结算其他对象、最后结算自己。非友方目标走
 *       PokemonDamage.fixed（typePolicy:none、无暴击、无击退）；自己与队友只能走宿主开放的原生自伤入口
 *       world.health（队友的友伤仍会被宿主 mayHit 拒绝，见报告的 needs）。被原生拒绝只报被挡下，不报成功；
 *       自己若被这一发带走，直接停下，不再触碰已失活的动作。
 * 反制：走出歌域、提前清掉 carrier、打断或杀死施法者、或在三拍内结束战斗。
 */
namespace PokemonSkills {
    function perishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }
    function perishFlat(a: CombatPoint, b: CombatPoint): number {
        const dx = a.x() - b.x(), dz = a.z() - b.z();
        return Math.sqrt(dx * dx + dz * dz);
    }

    define({
        id: perishId,
        cooldownParameter: "recharge",
        name: "灭亡之歌",
        description: "唱起一首三拍子的歌，把最近的一圈活物（连同你自己）写进名单；施法者必须留在原地唱完三拍，每拍结束还在歌域里的人就离结算更近一步，末拍对仍在名单上的活物结算一次有限的固定伤害。跑出歌域、提前清除、打断或杀死施法者都能让这首歌作废；它是一首会把自己也算进去的歌。",
        uses: ["打不过时把整场拉平，逼对手速战或撤退", "对着成群的敌人一次点名", "在必输的交换里把对手主力一起带走"],
        kind: "self",
        range: 0,
        prepare: 14,
        active: 0,
        recover: 8,
        cooldown: 300,
        stationary: true,
        style: "perishsong",
        defaults: { dirge: false, ai: { threshold: 0.55, maxChase: 12, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[perishId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(perishId, "tempo", context),
                recover: p(perishId, "aftercast", context),
                cooldown: p(perishId, "recharge", context),
                active: 0,
                range: 0
            };
        },
        windup: function (action, _config, prepare) {
            const motes = Math.max(8, Math.round(p(perishId, "motes", action)));
            action.present("world_combat:move_perishsong/sing", perishScene, 1, action.origin(),
                JSON.stringify({ moment: "sing", target: String(action.actor().ref()), motes: motes }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const radius = pokemon ? p(perishId, "songRadius", pokemon) : 4;
            return { radius: radius, geometry: "circle", style: "perishsong", color: 0x5A6BB0, label: "灭亡之歌" };
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor();
            const me = world.observe(self);
            if (me === null) { done(action); return; }
            const origin = me.position(), singerEntity = world.nativeEntity(self);
            const radius = Math.max(2.5, p(perishId, "songRadius", action));
            const beatTicks = Math.max(1, Math.round(p(perishId, "beatTicks", action)));
            const total = beatTicks * perishTurns;
            const budget = Math.max(0, p(perishId, "judge", action));
            const motes = Math.max(8, Math.round(p(perishId, "motes", action)));
            const start = world.tick();
            const notes = WorldFeedback.actionScenes(perishNotesScene, 1);
            const domain = WorldFeedback.actionScenes(perishDomainScene, 1);
            const marks: { target: CombatActor; ref: string; key: string; out: boolean }[] = [];

            sound(action, "cobblemon:move.sing.actor");
            // 声音穿掩体：只按圈内距离取最近的其他人，不做视线判定；已在别的歌声里的对象不被重置。
            const heard = world.query(origin, radius, false).slice();
            heard.sort((a, b) => {
                const first = world.observe(a), second = world.observe(b);
                return (first ? first.position().minus(origin).length() : Infinity)
                    - (second ? second.position().minus(origin).length() : Infinity);
            });
            for (let i = 0; i < heard.length && marks.length < perishTargets - 1; i++) {
                const other = heard[i];
                if (String(other.ref()) === String(self.ref())) continue;
                if (world.observe(other) === null) continue;
                if (MobEffects.read(world, other, perishEffect) !== null) continue;
                const carrier = MobEffects.apply(world, other, perishEffect, total + 60);
                if (carrier === null) continue;
                MobEffects.bind(world, other, perishEffect, carrier);
                marks.push({ target: other, ref: String(other.ref()), key: String(carrier.key()), out: false });
            }
            const ownCarrier = MobEffects.apply(world, self, perishEffect, total + 60);
            if (ownCarrier !== null) {
                MobEffects.bind(world, self, perishEffect, ownCarrier);
                marks.push({ target: self, ref: String(self.ref()), key: String(ownCarrier.key()), out: false });
            }
            const caught = marks.length;
            WorldFeedback.emit(world, perishScene, 1, origin,
                { moment: "song", radius: radius, heard: caught, motes: motes, scale: radius / 4.0 }, 40);
            WorldFeedback.text(world, perishAbove(origin), perishSongText, [caught], 40);

            function release(current: CombatAction, mark: { target: CombatActor; ref: string; key: string; out: boolean }): void {
                if (mark.out) return;
                mark.out = true;
                const scope = current.world();
                const carrier = MobEffects.read(scope, mark.target, perishEffect);
                if (carrier !== null && String(carrier.key()) === mark.key) scope.removeMobEffect(mark.target, perishEffect, mark.key);
                notes.stop(current, "notes/" + mark.ref);
                const body = scope.observe(mark.target);
                if (body !== null && body.health() > 0) {
                    WorldFeedback.emit(scope, perishScene, 1, body.position(), { moment: "lift", target: mark.ref }, 24);
                    WorldFeedback.text(scope, perishAbove(body.position()), perishLiftText, [], 22);
                }
            }

            function present(current: CombatAction, turnsLeft: number): void {
                for (let i = 0; i < marks.length; i++) {
                    const mark = marks[i];
                    if (mark.out) continue;
                    const body = current.world().observe(mark.target);
                    if (body === null) { release(current, mark); continue; }
                    notes.show(current, "notes/" + mark.ref, body.position(), { moment: "notes", target: mark.ref,
                        turnsLeft: turnsLeft, turns: perishTurns, start: start, beatTicks: beatTicks, motes: motes });
                }
                domain.show(current, "domain", origin, { moment: "domain", origin: [origin.x(), origin.y(), origin.z()],
                    radius: radius, start: start, beatTicks: beatTicks, turns: perishTurns, turnsLeft: turnsLeft });
            }

            function settle(current: CombatAction): void {
                const scope = current.world(), move = CobblemonCombat.moveTemplate(perishId), selfRef = String(self.ref());
                const recipients = marks.filter(mark => !mark.out);
                const others = recipients.filter(mark => mark.ref !== selfRef), own = recipients.filter(mark => mark.ref === selfRef);
                const receipt = PerishJudgments.prepare(scope, self, origin, recipients);
                // Clear action-owned lines before the potentially fatal last native hurt.
                notes.stop(current); domain.stop(current);
                function judgeOne(mark: { target: CombatActor; ref: string; key: string; out: boolean }): boolean {
                    if (!scope.valid(mark.target)) return true;
                    const carrier = MobEffects.read(scope, mark.target, perishEffect), body = scope.observe(mark.target);
                    if (!carrier || String(carrier.key()) !== mark.key || !body || body.health() <= 0) return true;
                    scope.removeMobEffect(mark.target, perishEffect, mark.key);
                    PerishJudgments.attempt(receipt, mark.ref);
                    const features: PokemonDamage.Features & { perishReceipt: string } = {
                        category: "special", sound: true, knockback: false, segment: "judge", perishReceipt: receipt,
                        damageRelations: { self: true, friendly: true } };
                    PokemonDamage.fixed(scope, mark.target, move, budget, features, "none", current);
                    // Only the native object captured while alive is read after a possibly fatal hit/reflection.
                    return !!singerEntity && singerEntity.isAlive() && !singerEntity.isRemoved();
                }
                for (const mark of others) if (!judgeOne(mark)) return;
                for (const mark of own) if (!judgeOne(mark)) return;
                done(current);
            }

            function advance(current: CombatAction, elapsed: number): void {
                current.stopMovement();
                const caster = current.world().observe(self);
                if (!caster || caster.position().minus(origin).length() > .35) {
                    marks.forEach(mark => release(current, mark));
                    notes.stop(current); domain.stop(current); done(current); return;
                }
                for (let i = 0; i < marks.length; i++) {
                    const mark = marks[i];
                    if (mark.out) continue;
                    const body = current.world().observe(mark.target);
                    if (body === null || body.health() <= 0) { release(current, mark); continue; }
                    if (perishFlat(body.position(), origin) > radius) release(current, mark);
                }
                if (elapsed >= total) { settle(current); return; }
                if (elapsed % beatTicks === 0) {
                    const turnsLeft = Math.max(1, perishTurns - Math.floor(elapsed / beatTicks));
                    present(current, turnsLeft);
                    if (elapsed > 0) WorldFeedback.emit(current.world(), perishScene, 1, origin,
                        { moment: "beat", radius: radius, turnsLeft: turnsLeft, scale: radius / 4.0 }, 18);
                }
                current.after(1, function (next) { advance(next, elapsed + 1); });
            }

            advance(action, 0);
        }
    });
}
