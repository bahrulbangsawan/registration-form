'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Calendar, Phone, MapPin, X, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { type Member } from '@/hooks'

interface IdentityCardProps {
  member: Member
  onClear?: () => void
  showClearButton?: boolean
}

export function IdentityCard({ member, onClear, showClearButton = true }: IdentityCardProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatPhone = (phone: string) => {
    // Simple phone formatting for Indonesian numbers
    if (phone.startsWith('62')) {
      return `+${phone}`
    }
    if (phone.startsWith('0')) {
      return `+62${phone.slice(1)}`
    }
    return phone
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Member Identity</CardTitle>
          </div>
          {showClearButton && onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Confirm this is the correct member before proceeding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Member ID Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {member.member_id}
            </Badge>
            <Badge variant="outline">
              {member.branch.toUpperCase()}
            </Badge>
          </div>

          {/* Member Details Table */}
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium w-32">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Name
                  </div>
                </TableCell>
                <TableCell>{member.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Birth Date
                  </div>
                </TableCell>
                <TableCell>{formatDate(member.birthdate)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Parent/Guardian
                  </div>
                </TableCell>
                <TableCell>{member.parent_name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Contact
                  </div>
                </TableCell>
                <TableCell>
                  <a 
                    href={`tel:${formatPhone(member.contact)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {formatPhone(member.contact)}
                  </a>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Branch
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {member.branch.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
              {member.registration_status && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {member.registration_status === 'submitted' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {member.registration_status === 'registered' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                      {member.registration_status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                      Status
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={member.registration_status === 'submitted' ? 'default' : 
                              member.registration_status === 'registered' ? 'secondary' : 'outline'}
                      className={member.registration_status === 'submitted' ? 'bg-green-100 text-green-800' :
                                member.registration_status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'}
                    >
                      {member.registration_status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Existing Registrations Section */}
          {member.existing_registrations && member.existing_registrations.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Previously Submitted Registrations
              </h4>
              <div className="space-y-2">
                {member.existing_registrations.map((registration, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{registration.activity_name}</div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Token #{registration.token}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}