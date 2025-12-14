import { useState, useEffect, useRef } from 'react'
import './CreatePlaylistModal.css'

interface CreatePlaylistModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (name: string, description?: string) => Promise<any>
}

/**
 * Modal for creating a new playlist
 * Features a name input, optional description, and animated backdrop
 */
export function CreatePlaylistModal({ isOpen, onClose, onCreate }: CreatePlaylistModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Focus the input when modal opens
    useEffect(() => {
        if (isOpen && nameInputRef.current) {
            setTimeout(() => nameInputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setName('')
            setDescription('')
            setIsCreating(false)
        }
    }, [isOpen])

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
                handleCreate()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, name, onClose])

    const handleCreate = async () => {
        if (!name.trim() || isCreating) return

        setIsCreating(true)
        try {
            await onCreate(name.trim(), description.trim() || undefined)
            onClose()
        } catch (error) {
            console.error('Error creating playlist:', error)
        } finally {
            setIsCreating(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="create-playlist-overlay" onClick={onClose}>
            <div className="create-playlist-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Playlist</h2>
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label htmlFor="playlist-name">Playlist Name</label>
                        <input
                            ref={nameInputRef}
                            id="playlist-name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Awesome Playlist"
                            maxLength={100}
                            className="playlist-name-input"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="playlist-description">Description (optional)</label>
                        <textarea
                            id="playlist-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            maxLength={500}
                            rows={3}
                            className="playlist-description-input"
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="cancel-button"
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        className="create-button"
                        onClick={handleCreate}
                        disabled={!name.trim() || isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Playlist'}
                    </button>
                </div>
            </div>
        </div>
    )
}
