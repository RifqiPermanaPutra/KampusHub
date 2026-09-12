/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import { CommentRow, rowToComment } from '../lib/mappers';
import { Comment } from '../types';

const TABLE = 'comments';

export const commentService = {
  async getComments(eventId: string): Promise<Comment[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as CommentRow[]).map(rowToComment);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  async addComment(commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          event_id: commentData.eventId,
          user_id: commentData.userId,
          user_name: commentData.userName,
          body: commentData.body,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    } catch (error) {
      throwDbError(error, OperationType.CREATE, TABLE);
    }
  },

  subscribe(eventId: string, callback: (comments: Comment[]) => void) {
    void this.getComments(eventId).then(callback);

    const channel = supabase
      .channel(`comments-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `event_id=eq.${eventId}` },
        () => { void this.getComments(eventId).then(callback); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  },
};
