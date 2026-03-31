import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from students.models import Student
from payments.models import FeeCategory, CCAActivity, PaymentStatus, Receipt

class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # Clear existing data
        Receipt.objects.all().delete()
        Student.objects.all().delete()
        FeeCategory.objects.all().delete()
        CCAActivity.objects.all().delete()
        PaymentStatus.objects.all().delete()

        # Create Payment Statuses
        paid_status = PaymentStatus.objects.create(name='Paid')
        unpaid_status = PaymentStatus.objects.create(name='Unpaid')

        # Create Fee Categories
        tuition = FeeCategory.objects.create(name='Tuition Fee', description='Monthly tuition fee')
        bus = FeeCategory.objects.create(name='Bus Fee', description='School bus transportation fee')
        cca = FeeCategory.objects.create(name='CCA Fee', description='Co-curricular activities fee')
        uniform = FeeCategory.objects.create(name='Uniform Fee', description='School uniform fee')

        # Create CCA Activities
        karate = CCAActivity.objects.create(name='Karate', description='Martial arts training')
        music = CCAActivity.objects.create(name='Music', description='Vocal and instrumental music')
        dance = CCAActivity.objects.create(name='Dance', description='Classical and modern dance')
        football = CCAActivity.objects.create(name='Football', description='Soccer coaching')

        # Create Students
        classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
        divisions = ['A', 'B', 'C']
        
        students = []
        for i in range(1, 21): # 20 students
            adm_no = f'2026{i:03}'
            s_class = random.choice(classes)
            s_div = random.choice(divisions)
            s = Student.objects.create(
                admission_no=adm_no,
                name=f'Student {i}',
                student_class=s_class,
                division=s_div,
                phone_number=f'9876543{i:03}',
                status='Active'
            )
            # Assign random CCA activities
            if random.random() > 0.6:
                s.cca_activities.add(random.choice([karate, music, dance, football]))
            students.append(s)

        # Create Receipts (Paid and Unpaid)
        months = ['January', 'February', 'March']
        today = date.today()
        
        for s in students:
            # Create some paid receipts for Jan and Feb
            for month in months[:2]:
                if random.random() > 0.2: # 80% paid
                    Receipt.objects.create(
                        receipt_no=f'R-{s.admission_no}-{month[:3].upper()}',
                        date=today - timedelta(days=random.randint(5, 45)),
                        student=s,
                        fee_type=tuition,
                        amount=2500.00,
                        month=month,
                        payment_status=paid_status
                    )
                    # Randomly pay bus fee too
                    if random.random() > 0.5:
                         Receipt.objects.create(
                            receipt_no=f'B-{s.admission_no}-{month[:3].upper()}',
                            date=today - timedelta(days=random.randint(5, 45)),
                            student=s,
                            fee_type=bus,
                            amount=800.00,
                            month=month,
                            payment_status=paid_status
                        )
                else: # 20% unpaid
                    Receipt.objects.create(
                        receipt_no=f'UP-{s.admission_no}-{month[:3].upper()}',
                        date=today - timedelta(days=random.randint(5, 45)),
                        student=s,
                        fee_type=tuition,
                        amount=2500.00,
                        month=month,
                        payment_status=unpaid_status
                    )

            # Some unpaid for March
            if random.random() > 0.3: # 70% chance of having a pending record for March
                Receipt.objects.create(
                    receipt_no=f'PEND-{s.admission_no}-MAR',
                    date=today,
                    student=s,
                    fee_type=tuition,
                    amount=2500.00,
                    month='March',
                    payment_status=unpaid_status
                )

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(students)} students and their receipt records.'))
